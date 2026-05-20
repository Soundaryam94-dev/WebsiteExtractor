import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

export default function Home() {
  return (
    <main className="h-screen overflow-hidden bg-dark-950">
      <Navbar />
      <HeroSection />
    </main>
  );
}
