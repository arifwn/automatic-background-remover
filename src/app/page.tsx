import Image from "next/image";

import BackgroundRemover from '../components/BackgroundRemover';


export default function Home() {
  return (
    <main className="flex min-h-screen p-8 flex-col">
      <BackgroundRemover className="grow" />
    </main>
  );
}
