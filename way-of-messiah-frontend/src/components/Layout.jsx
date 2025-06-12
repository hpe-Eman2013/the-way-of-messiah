import Header from "./Header";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
      <Header /> {/* ✅ This is where it's used */}
      <main className="p-6">{children}</main>
    </div>
  );
}
