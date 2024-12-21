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
        // @ts-ignore
        window.apna = apna;
      }   
      console.log('nostr.getProfile return value: ', await apna.nostr.getProfile())

      // apna.nostr.subscribeToFeed("FOLLOWING_FEED",(e: any) => {
      //   setNotes((notes)=>[...notes, e])
      // })

      // apna.nostr.subscribeToNotifications((e: any) => {
      //   // setNotes((notes)=>[e,...notes])
      //   console.log(`NOTIFICATION: ${e.content}`)
      // })
    }
    init()
  }, [])

  return (
    <main>
      <h1>Social</h1>
      <button onClick={async () => {console.log(await apna.nostr.getProfile());}}>nostr.getProfile()</button><br></br>
      <button onClick={async () => {const oldProfile = await apna.nostr.getProfile();oldProfile.metadata.about = `Bitcoin Enthusiast ${Date.now()}`;console.log(await apna.nostr.updateProfile(oldProfile));}}>nostr.updateProfile()</button><br></br>
      <button onClick={async () => {console.log(await apna.nostr.followNpub("npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e"));}}>nostr.followNpub()</button><br></br>
      <button onClick={async () => {console.log(await apna.nostr.unfollowNpub("npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e"));}}>nostr.unfollowNpub()</button><br></br>
      <button onClick={async () => {console.log(await apna.nostr.publishNote(`Hello World ${Date.now()}`));}}>nostr.publishNote()</button><br></br>
      <button onClick={async () => {console.log(await apna.nostr.likeNote(`note187j8dxwta5zvxle446uqutxue764q79vxmtv85dw7fnujlqgdm2qm7kelc`));}}>nostr.likeNote()</button><br></br>
      <button onClick={async () => {console.log(await apna.nostr.repostNote(`note187j8dxwta5zvxle446uqutxue764q79vxmtv85dw7fnujlqgdm2qm7kelc`, 'test quote'));}}>nostr.repostNote()</button><br></br>
      <button onClick={async () => {console.log(await apna.nostr.replyToNote(`note187j8dxwta5zvxle446uqutxue764q79vxmtv85dw7fnujlqgdm2qm7kelc`, `test reply ${Date.now()}`));}}>nostr.replyToNote()</button><br></br>
      <button onClick={async () => {setNotes([]);await apna.nostr.subscribeToFeed('FOLLOWING_FEED', (e: any) => {setNotes((notes)=>[...notes, e])});}}>nostr.subscribeToFeed()</button><br></br>
      
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
