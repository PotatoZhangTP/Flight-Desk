"use client";
import Image, { type ImageProps } from "next/image";
import { useText } from "./i18n";
export default function LocalizedImage(props: ImageProps) {
  const t = useText();
  return <Image {...props} alt={t(props.alt)} />;
}
