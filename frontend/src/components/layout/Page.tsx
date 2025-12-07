export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      {children}
    </div>
  );
}
