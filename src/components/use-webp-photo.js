"use client";

import { useEffect, useRef, useState } from "react";
import { checkSourceImage, toWebpFile } from "@/lib/webp-client";

// Foto para formularios: convierte la imagen elegida/arrastrada a WebP en el navegador
// y la deja en un <input type="file" name="photo" hidden ref={photoRef}> que viaja con el form.
// El input visible para elegir archivo NO debe tener `name` (iría la imagen original).
export function useWebpPhoto() {
  const photoRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function clearInput() {
    if (photoRef.current) photoRef.current.value = "";
  }

  async function pick(file) {
    setError(null);
    if (!file) return;
    const problem = checkSourceImage(file);
    if (problem) {
      clearInput();
      setPreview(null);
      return setError(problem);
    }
    setConverting(true);
    try {
      const webp = await toWebpFile(file);
      const dt = new DataTransfer();
      dt.items.add(webp);
      photoRef.current.files = dt.files;
      setPreview(URL.createObjectURL(webp));
    } catch (e) {
      clearInput();
      setPreview(null);
      setError(e.message);
    } finally {
      setConverting(false);
    }
  }

  function reset() {
    clearInput();
    setPreview(null);
    setError(null);
  }

  return { photoRef, preview, error, converting, pick, reset };
}
