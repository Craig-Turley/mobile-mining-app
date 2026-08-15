import { deleteDictionary } from "@/db/features/dictionaries/dictionaries.actions";

export async function deleteDict(filePath: string) {
  return await deleteDictionary(filePath);
}
