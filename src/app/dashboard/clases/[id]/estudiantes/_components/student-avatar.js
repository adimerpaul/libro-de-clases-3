// Foto del estudiante (servida con sesión por /api/fotos) o sus iniciales.
export default function StudentAvatar({ student, size = 24 }) {
  const style = { width: size, height: size };
  if (student.photo) {
    return (
      // next/image no sirve aquí: su optimizador pide la imagen sin la cookie de sesión.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/fotos/estudiantes/${student.id}?v=${encodeURIComponent(student.photo)}`}
        alt=""
        style={style}
        className="flex-none rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className="grid flex-none place-items-center rounded-full bg-accent-100 font-semibold text-accent-800"
    >
      {student.firstName[0]}
      {student.lastName[0]}
    </span>
  );
}
