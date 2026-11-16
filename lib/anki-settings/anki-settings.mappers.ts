import { Deck, Model } from 'genanki-ts';
import type { DeckFormData } from '@/db/app/schema/decks';
import type { AllowedModelField, ModelFormData } from '@/db/app/schema/models';
import { buildReqs, buildTemplates } from './anki-settings.builders';
import { DEFAULT_CSS } from './anki-settings.constants';

export function formDataToDeck(formData: DeckFormData): Deck<AllowedModelField[]> {
  return new Deck(Number(formData.id), formData.name, formData.description);
}

export function formDataToModel(formData: ModelFormData): Model<AllowedModelField[]> {
  return new Model({
    id: Number(formData.id),
    name: formData.name,
    flds: formData.fields,
    tmpls: buildTemplates(formData.templates),
    req: buildReqs(formData.templates, formData.fields),
    css: DEFAULT_CSS,
  });
}
