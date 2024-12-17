"use client"
import { useEffect, useState } from "react";
import { ApnaApp } from "@apna/sdk";
import Image from "next/image"

interface AuthorMetadata {
  name?: string;
  picture?: string;
  nip05?: string;
}

let apna: ApnaApp;

export default function Home() {
  const [notes, setNotes] = useState<any[]>([]);
  const [authorMetadata, setAuthorMetadata] = useState<
    Record<string, AuthorMetadata>
  >({});
  useEffect(() => {
    const init = async () => {
      if (!apna) {
        const { ApnaApp } = (await import('@apna/sdk'))
        apna = new ApnaApp({ appId: 'apna-nostr-mvp-1' });
      }   
      console.log('nostr.getProfile return value: ', await apna.nostr.getProfile())

      // apna.nostr.subscribeToEvents([],(e: any) => {
      //   setNotes((notes)=>[e,...notes])
      // })
    }
    init()
  }, [])

  return (
    <main>
      <h1>Social</h1>
      <button onClick={async () => {console.log(await apna.nostr.getProfile());}}>nostr.getProfile()</button>
      <pre id="nostr.getProfile"></pre>
      {notes.map((note, index) => (
        <div key={index} style={{ border: "solid 1px" }}>
        {/* <Image width={50} height={50} alt="author" src={authorMetadata[note.pubkey]?.picture ?? "https://www.kindpng.com/picc/m/252-2524695_dummy-profile-image-jpg-hd-png-download.png"}/> */}
          <li>{note.content}</li>
          <li>{authorMetadata[note.pubkey]?.name ?? note.pubkey}</li>
          <li>{note.created_at}</li>
        </div>
      ))}
    </main>
  );
}
