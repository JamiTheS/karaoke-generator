import KaraokePlayer from "@/components/KaraokePlayer";

interface KaraokePageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: KaraokePageProps) {
  const { videoId } = await params;
  return {
    title: `Karaoke - Instant Karaoke`,
    description: `Sing along with synchronized lyrics`,
    openGraph: {
      title: "Instant Karaoke",
      description: "Sing along with synchronized lyrics",
      images: [`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`],
    },
  };
}

export default async function KaraokePage({ params }: KaraokePageProps) {
  const { videoId } = await params;

  return <KaraokePlayer videoId={videoId} />;
}
