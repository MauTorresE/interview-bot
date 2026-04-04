export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-12 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            EntrevistaAI
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
