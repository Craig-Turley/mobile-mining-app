import { StoredModel } from '@/db/app/schema';
import { AllowedModelField, type ModelFieldName } from '@/lib/anki-settings';
import { Model } from 'genanki-ts';
import { generate, parse, walk } from 'css-tree';

function fieldName(name: string): ModelFieldName {
  return (name === 'meaning' ? 'glossary' : name) as ModelFieldName;
}

function templateHtml(html: string): string {
  return html
    .replace(/\{\{([^{}]*)\}\}/gu, (token, content: string) => {
      const match = content.trim().match(/^([#^/]?)([\w-]+:)*meaning$/u);
      return match ? `{{${content.trim().replace(/meaning$/u, 'glossary')}}}` : token;
    })
    .replace(
      /class=(["'])(.*?)\1/gu,
      (_, quote: string, classes: string) =>
        `class=${quote}${classes
          .split(/\s+/u)
          .map((name) => (name === 'meaning' ? 'glossary' : name))
          .join(' ')}${quote}`
    );
}

export function mapStoredModel(storedModel: StoredModel): StoredModel {
  const renamed = storedModel.model.flds.some((field) => String(field.name) === 'meaning');
  const css = parse(storedModel.model.css);
  walk(css, (node) => {
    if (node.type === 'ClassSelector' && node.name === 'meaning') node.name = 'glossary';
  });
  return {
    ...storedModel,
    modelFormData: {
      ...storedModel.modelFormData,
      fields: storedModel.modelFormData.fields.map((field) => ({
        ...field,
        name: fieldName(field.name),
      })),
      templates: storedModel.modelFormData.templates.map((template) => ({
        ...template,
        frontFields: template.frontFields.map(fieldName),
        backFields: template.backFields.map(fieldName),
        rule: { ...template.rule, fields: template.rule.fields.map(fieldName) },
      })),
    },
    model: new Model<AllowedModelField[]>({
      id: storedModel.model.id,
      name: storedModel.model.name,
      type: storedModel.model.type,
      mod: renamed ? Math.floor(Date.now() / 1000) : storedModel.model.mod,
      usn: storedModel.model.usn,
      sortf: storedModel.model.sortf,
      did: storedModel.model.did,
      flds: storedModel.model.flds.map((field) => ({ ...field, name: fieldName(field.name) })),
      tmpls: storedModel.model.tmpls.map((template) => ({
        ...template,
        qfmt: templateHtml(template.qfmt),
        afmt: templateHtml(template.afmt),
        ...(template.bqfmt === undefined ? {} : { bqfmt: templateHtml(template.bqfmt) }),
        ...(template.bafmt === undefined ? {} : { bafmt: templateHtml(template.bafmt) }),
      })),
      css: generate(css),
      latexPre: storedModel.model.latexPre,
      latexPost: storedModel.model.latexPost,
      latexsvg: storedModel.model.latexsvg,
      req: storedModel.model.req,
      vers: storedModel.model.vers,
      originalStockKind: storedModel.model.originalStockKind,
      originalId: storedModel.model.originalId,
    }),
  };
}
