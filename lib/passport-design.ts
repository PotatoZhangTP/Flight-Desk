/** Single source of truth for the passport design used by defaults, preview and reset. */
export const defaultPassportDesign = {
  background: "#171427",
  brandColor: "#D5B36A",
  font: "Georgia",
  titleColor: "#D5B36A",
  texture: "plain",
  textureColor: "#B9AA88",
  innerBackground: "#f7f0df",
  innerTitleColor: "#34291c",
  innerFont: "Georgia",
  innerTexture: "plain",
  innerTextureColor: "#b9aa88",
  innerPageNumberColor: "#b9aa88",
} as const;

// Kept as a named cover export for the landing/demo passport consumers.
export const defaultPassportCover = defaultPassportDesign;
