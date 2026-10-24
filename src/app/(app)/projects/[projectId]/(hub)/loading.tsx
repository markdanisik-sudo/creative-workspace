/**
 * Shown the moment another section of the project is tapped, while its
 * content loads: the title, phases and tabs above stay as they are.
 */
export default function ProjectSectionLoading() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
      {["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"].map((span, index) => (
        <div
          key={index}
          className={`surface-invert h-[188px] animate-pulse rounded-[24px] bg-surface opacity-60 ${span}`}
        />
      ))}
    </div>
  );
}
