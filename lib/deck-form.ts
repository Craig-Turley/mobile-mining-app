import { Deck } from "genanki-ts";
import { AllowedModelField } from "./flash-card";

export type DeckFormData = {
  applicationId?: number;
  id: number;
  name: string;
  description: string;
};

export function formDataToDeck(formData: DeckFormData): Deck<AllowedModelField[]> {
  return new Deck(Number(formData.id), formData.name, formData.description);
}
