package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type JMdict struct {
	Version       string            `json:"version"`
	Languages     []string          `json:"languages"`
	DictDate      string            `json:"dictDate"`
	DictRevisions []string          `json:"dictRevisions"`
	CommonOnly    bool              `json:"commonOnly"`
	Tags          map[string]string `json:"tags"`
	Words         []Word            `json:"words"`
}

type Xref []any

type Word struct {
	ID    string  `json:"id"`
	Kanji []Kanji `json:"kanji"`
	Kana  []Kana  `json:"kana"`
	Sense []Sense `json:"sense"`
}

type Kanji struct {
	Common bool     `json:"common"`
	Text   string   `json:"text"`
	Tags   []string `json:"tags"`
}

type Kana struct {
	Common         bool     `json:"common"`
	Text           string   `json:"text"`
	Tags           []string `json:"tags"`
	AppliesToKanji []string `json:"appliesToKanji"`
}

type Sense struct {
	PartOfSpeech   []string `json:"partOfSpeech"`
	AppliesToKanji []string `json:"appliesToKanji"`
	AppliesToKana  []string `json:"appliesToKana"`

	Related []Xref `json:"related"`
	Antonym []Xref `json:"antonym"`

	Field   []string `json:"field"`
	Dialect []string `json:"dialect"`
	Misc    []string `json:"misc"`
	Info    []string `json:"info"`

	LanguageSource []LanguageSource `json:"languageSource"`

	Gloss    []Gloss   `json:"gloss"`
	Examples []Example `json:"examples"`
}

type Gloss struct {
	Lang   string  `json:"lang"`
	Gender *string `json:"gender"`
	Type   *string `json:"type"`
	Text   string  `json:"text"`
}

type LanguageSource struct {
	Lang  string  `json:"lang"`
	Text  *string `json:"text"`
	Full  bool    `json:"full"`
	Wasei bool    `json:"wasei"`
}

type Example struct {
	Source    ExampleSource     `json:"source"`
	Text      string            `json:"text"`
	Sentences []ExampleSentence `json:"sentences"`
}

type ExampleSource struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type ExampleSentence struct {
	Lang string `json:"lang"`
	Text string `json:"text"`
}

type WordDictionaryEntry struct {
	ID         int
	Dictionary string
	KanjiJSON  string
	KanaJSON   string
	SenseJSON  string
}

func WordEntryFromWord(word *Word, dictionary string) *WordDictionaryEntry {
	id, err := strconv.Atoi(word.ID)
	if err != nil {
		panic(err)
	}

	kanjiJSON, err := json.Marshal(word.Kanji)
	if err != nil {
		panic(err)
	}

	kanaJSON, err := json.Marshal(word.Kana)
	if err != nil {
		panic(err)
	}

	senseJSON, err := json.Marshal(word.Sense)
	if err != nil {
		panic(err)
	}

	return &WordDictionaryEntry{
		ID:         id,
		Dictionary: dictionary,
		KanjiJSON:  string(kanjiJSON),
		KanaJSON:   string(kanaJSON),
		SenseJSON:  string(senseJSON),
	}
}

type LookupEntry struct {
	Dictionary string
	EntryID    int
	Expression string
	Reading    string
}

func appliesToAllKanji(appliesToKanji []string) bool {
	return len(appliesToKanji) == 1 && appliesToKanji[0] == "*"
}

type Form struct {
	Expression string
	Reading    string
}

const (
	DATABASE_NAME      = "jmdict-v1.0.0.db"
	DICTIONARY_NAME    = "JMDict"
	ENTRIES_TABLE_NAME = "entries"
	LOOKUP_TABLE_NAME  = "lookup"
)

var DROP_LOOKUP_QUERY = fmt.Sprintf(
	"DROP TABLE IF EXISTS %s;",
	LOOKUP_TABLE_NAME,
)

var DROP_ENTRIES_QUERY = fmt.Sprintf(
	"DROP TABLE IF EXISTS %s;",
	ENTRIES_TABLE_NAME,
)

var CREATE_ENTRIES_QUERY = fmt.Sprintf(`
CREATE TABLE %s (
	id INTEGER NOT NULL,
	dictionary TEXT NOT NULL,
	kanji_json TEXT NOT NULL,
	kana_json TEXT NOT NULL,
	sense_json TEXT NOT NULL,

	PRIMARY KEY (dictionary, id)
);`, ENTRIES_TABLE_NAME)

var CREATE_LOOKUP_QUERY = fmt.Sprintf(`
CREATE TABLE %s (
	dictionary TEXT NOT NULL,
	entry_id INTEGER NOT NULL,
	expression TEXT,
	reading TEXT,

	FOREIGN KEY (dictionary, entry_id)
		REFERENCES %s(dictionary, id)
);`, LOOKUP_TABLE_NAME, ENTRIES_TABLE_NAME)

var INSERT_ENTRY_QUERY = fmt.Sprintf(`
INSERT INTO %s (
	id,
	dictionary,
	kanji_json,
	kana_json,
	sense_json
)
VALUES (?, ?, ?, ?, ?)
`, ENTRIES_TABLE_NAME)

var INSERT_LOOKUP_QUERY = fmt.Sprintf(`
INSERT INTO %s (
	dictionary,
	entry_id,
	expression,
	reading
)
VALUES (?, ?, ?, ?)
`, LOOKUP_TABLE_NAME)

var CREATE_TABLE_COMMANDS = []string{
	// Child table must be dropped before parent table.
	DROP_LOOKUP_QUERY,
	DROP_ENTRIES_QUERY,

	// Parent table must exist before child FK is created.
	CREATE_ENTRIES_QUERY,
	CREATE_LOOKUP_QUERY,
}

func buildLookupForms(word Word) []Form {
	forms := make(
		[]Form,
		0,
		max(1, len(word.Kanji))*len(word.Kana),
	)

	for _, kana := range word.Kana {
		switch {
		case len(word.Kanji) == 0 || len(kana.AppliesToKanji) == 0:
			forms = append(forms, Form{
				Expression: "",
				Reading:    kana.Text,
			})

		case appliesToAllKanji(kana.AppliesToKanji):
			for _, kanji := range word.Kanji {
				forms = append(forms, Form{
					Expression: kanji.Text,
					Reading:    kana.Text,
				})
			}

		default:
			for _, expression := range kana.AppliesToKanji {
				forms = append(forms, Form{
					Expression: expression,
					Reading:    kana.Text,
				})
			}
		}
	}

	return forms
}

func processDictionary(db *sql.DB) error {
	file, err := os.Open("./dictionaries/jmdict-examples-eng-3.6.2.json")
	if err != nil {
		return err
	}
	defer file.Close()

	var dict JMdict
	if err := json.NewDecoder(file).Decode(&dict); err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, q := range CREATE_TABLE_COMMANDS {
		if _, err := tx.Exec(q); err != nil {
			return fmt.Errorf("creating schema: %w", err)
		}
	}

	entryStmt, err := tx.Prepare(INSERT_ENTRY_QUERY)
	if err != nil {
		return err
	}
	defer entryStmt.Close()

	lookupStmt, err := tx.Prepare(INSERT_LOOKUP_QUERY)
	if err != nil {
		return err
	}
	defer lookupStmt.Close()

	for _, word := range dict.Words {
		entry := WordEntryFromWord(&word, DICTIONARY_NAME)

		if _, err := entryStmt.Exec(
			entry.ID,
			entry.Dictionary,
			entry.KanjiJSON,
			entry.KanaJSON,
			entry.SenseJSON,
		); err != nil {
			return fmt.Errorf(
				"inserting entry %s:%d: %w",
				entry.Dictionary,
				entry.ID,
				err,
			)
		}

		forms := buildLookupForms(word)

		for _, form := range forms {
			if _, err := lookupStmt.Exec(
				entry.Dictionary,
				entry.ID,
				form.Expression,
				form.Reading,
			); err != nil {
				return fmt.Errorf(
					"inserting lookup for %s:%d: %w",
					entry.Dictionary,
					entry.ID,
					err,
				)
			}
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
		log.Fatal(
			"usage: go run ./scripts/jitendex <operation> <sqlite-file-output-path>",
		)
	}

	operation := os.Args[1]
	outputPath := os.Args[2]

	db, err := sql.Open(
		"sqlite3",
		outputPath+"/"+DATABASE_NAME+"?_foreign_keys=on",
	)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Force the connection to be established now and verify FK support.
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	start := time.Now()

	switch operation {
	case "process_dict":
		if err := processDictionary(db); err != nil {
			log.Fatal(err)
		}

	// case "create_indexes":
	// 	if err := createIndexes(db); err != nil {
	// 		log.Fatal(err)
	// 	}

	default:
		log.Fatalf(
			"Operation not supported. Please use one of the following options: %s",
			strings.Join(SUPPORTED_OPERATIONS, " "),
		)
	}

	end := time.Now()

	log.Printf("Started:  %s", start.Format(time.RFC3339))
	log.Printf("Finished: %s", end.Format(time.RFC3339))
	log.Printf("Complete. Took: %s", end.Sub(start))
}
