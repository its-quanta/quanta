"use client";

type ProjectPageMainProps = {
  children: React.ReactNode;
};

export function ProjectPageMain({ children }: ProjectPageMainProps) {
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6">
        {children}
      </div>
    </main>
  );
}
