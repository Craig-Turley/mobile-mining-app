import { StoredModel } from "@/db/app/schema";
import { AllowedModelField } from "@/lib/anki-settings";
import { Model } from "genanki-ts";

export function mapStoredModel(storedModel: StoredModel): StoredModel {
  return {
    ...storedModel,
    model: new Model<AllowedModelField[]>({
      id: storedModel.model.id,
      name: storedModel.model.name,
      type: storedModel.model.type,
      mod: storedModel.model.mod,
      usn: storedModel.model.usn,
      sortf: storedModel.model.sortf,
      did: storedModel.model.did,
      flds: storedModel.model.flds,
      tmpls: storedModel.model.tmpls,
      css: storedModel.model.css,
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
