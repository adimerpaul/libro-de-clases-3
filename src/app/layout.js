import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Libro de Clases 3.0",
  description: "Registro de clases, asistencia, calificaciones y antecedentes de cada estudiante.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full font-serif">{children}</body>
    </html>
  );
}
