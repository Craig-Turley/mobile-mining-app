package main

import (
	"archive/zip"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"log"
	"regexp"

	_ "github.com/mattn/go-sqlite3"
)

const DATABASE_NAME = "jitendex.db"
const TABLE_NAME = "entries"

var COLUMN_NAMES = []string{
	"expression",
	"reading",
	"definition_tags",
	"rules",
	"score",
	"definitions_json",
	"sequence",
	"term_tags",
}

// ["ヽ", "ヽ", "", "", 0, [{"type": "structured-content", "content": [{"tag": "div", "data": {"content": "sense-group"}, "content": [{"tag": "span", "title": "unclassified", "data": {"class": "tag", "code": "unc", "content": "part-of-speech-info"}, "content": "unclass"}, {"tag": "div", "data": {"content": "sense"}, "content": [{"tag": "ul", "data": {"content": "glossary"}, "content": {"tag": "li", "content": "repetition mark in katakana"}}, {"tag": "div", "data": {"content": "extra-info"}, "content": {"tag": "div", "content": {"tag": "div", "data": {"class": "extra-box", "content": "xref"}, "content": [{"tag": "div", "data": {"content": "xref-content"}, "content": [{"tag": "span", "lang": "en", "data": {"content": "reference-label"}, "content": "See also"}, {"tag": "a", "lang": "ja", "href": "?query=%E4%B8%80%E3%81%AE%E5%AD%97%E7%82%B9&wildcards=off&primary_reading=%E3%81%84%E3%81%A1%E3%81%AE%E3%81%98%E3%81%A6%E3%82%93", "content": [{"tag": "ruby", "content": ["一", {"tag": "rt", "content": "いち"}]}, "の", {"tag": "ruby", "content": ["字", {"tag": "rt", "content": "じ"}]}, {"tag": "ruby", "content": ["点", {"tag": "rt", "content": "てん"}]}]}]}, {"tag": "div", "data": {"content": "xref-glossary"}, "content": "kana iteration mark"}]}}}]}]}, {"tag": "div", "data": {"content": "attribution"}, "content": {"tag": "a", "href": "https://www.edrdg.org/jmwsgi/entr.py?svc=jmdict&q=1000000", "content": "JMdict"}}]}], 1000000, ""]

var INSERT_TERM_QUERY = fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", TABLE_NAME, strings.Join(COLUMN_NAMES, ", "), strings.TrimRight(strings.Repeat("?, ", len(COLUMN_NAMES)), ", "))
var CREATE_QUERY = fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
  id INTEGER PRIMARY KEY,
  expression TEXT NOT NULL,
  reading TEXT NOT NULL,
  definition_tags TEXT,
  rules TEXT,
  score REAL,
	definitions_json TEXT NOT NULL,
  sequence INTEGER,
  term_tags TEXT
);`, TABLE_NAME)

func indexQueryBuilder(idxName, tableName, column string) string {
	return fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s(%s);", idxName, tableName, column)
}

var INDEX_EXPRESSION = indexQueryBuilder("idx_entries_expression", TABLE_NAME, "expression")
var INDEX_READING = indexQueryBuilder("idx_entries_reading", TABLE_NAME, "reading")
var INDEX_SEQUENCE = indexQueryBuilder("idx_entries_sequence", TABLE_NAME, "sequence")

var INDEXES = []string{
	INDEX_EXPRESSION,
	INDEX_READING,
	INDEX_SEQUENCE,
}

type TermEntry struct {
	Expression      string
	Reading         string
	DefinitionTags  string
	Rules           string
	Score           float64
	DefinitionsJSON string
	Sequence        int64
	TermTags        string
}

func (e *TermEntry) UnmarshalJSON(data []byte) error {
	var row []json.RawMessage

	if err := json.Unmarshal(data, &row); err != nil {
		return err
	}

	if len(row) != 8 {
		return fmt.Errorf("expected 8 fields, got %d", len(row))
	}

	if err := json.Unmarshal(row[0], &e.Expression); err != nil {
		return fmt.Errorf("expression: %w", err)
	}

	if err := json.Unmarshal(row[1], &e.Reading); err != nil {
		return fmt.Errorf("reading: %w", err)
	}

	if string(row[2]) != "null" {
		if err := json.Unmarshal(row[2], &e.DefinitionTags); err != nil {
			return fmt.Errorf("definitionTags: %w", err)
		}
	}

	if string(row[3]) != "null" {
		if err := json.Unmarshal(row[3], &e.Rules); err != nil {
			return fmt.Errorf("rules: %w", err)
		}
	}

	if err := json.Unmarshal(row[4], &e.Score); err != nil {
		return fmt.Errorf("score: %w", err)
	}

	e.DefinitionsJSON = string(row[5])

	if err := json.Unmarshal(row[6], &e.Sequence); err != nil {
		return fmt.Errorf("sequence: %w", err)
	}

	if string(row[7]) != "null" {
		if err := json.Unmarshal(row[7], &e.TermTags); err != nil {
			return fmt.Errorf("termTags: %w", err)
		}
	}

	return nil
}

func processDictionary(db *sql.DB) error {
	if len(os.Args) < 4 {
		return errors.New("missing 4th arguments <dict-zip-path>")
	}

	zipPath := os.Args[3]

	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(CREATE_QUERY); err != nil {
		return err
	}

	termBankPattern := regexp.MustCompile(`^term_bank_\d+\.json$`)

	for _, file := range reader.File {
		if !termBankPattern.MatchString(file.Name) {
			continue
		}

		rc, err := file.Open()
		if err != nil {
			return err
		}

		data, err := io.ReadAll(rc)
		rc.Close()

		if err != nil {
			return err
		}

		var entries []TermEntry
		if err := json.Unmarshal(data, &entries); err != nil {
			return err
		}

		for _, e := range entries {
			if err := insertHelper(tx, e); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func createIndexes(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()

	for _, q := range INDEXES {
		if _, err := tx.Exec(q); err != nil {
			return err
		}
	}

	return tx.Commit()
}

var SUPPORTED_OPERATIONS = []string{
	"process_dict",
	"create_indexes",
}

func main() {
	if len(os.Args) < 3 {
		log.Fatal("usage: go run ./scripts/jitendex <operation> <sqlite-file-output-path>")
	}

	operation := os.Args[1]
	outputPath := os.Args[2]

	db, err := sql.Open("sqlite3", outputPath+"/"+DATABASE_NAME)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	switch operation {
	case "process_dict":
		if err := processDictionary(db); err != nil {
			log.Fatal(err)
		}
	case "create_indexes":
		if err := createIndexes(db); err != nil {
			log.Fatal(err)
		}
	default:
		log.Fatalf("Operation not supported. Please use one of the following options: %s", strings.Join(SUPPORTED_OPERATIONS, " "))
	}

	log.Println("Complete")
}

func insertHelper(tx *sql.Tx, t TermEntry) error {
	stmt, err := tx.Prepare(INSERT_TERM_QUERY)
	if err != nil {
		return err
	}

	if _, err := stmt.Exec(
		t.Expression,
		t.Reading,
		t.DefinitionTags,
		t.Rules,
		t.Score,
		t.DefinitionsJSON,
		t.Sequence,
		t.TermTags,
	); err != nil {
		return err
	}

	return nil
}
