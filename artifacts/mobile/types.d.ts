declare module "expo-file-system/legacy" {
  export enum EncodingType {
    UTF8 = "utf8",
    Base64 = "base64",
  }
  export function readAsStringAsync(
    fileUri: string,
    options?: {
      encoding?: EncodingType | "utf8" | "base64";
      length?: number;
      position?: number;
    },
  ): Promise<string>;
}
