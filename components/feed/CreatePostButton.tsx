"use client";

import { Button } from "@/components/Button";

// Opens the post box at the top of the feed
export function CreatePostButton() {
  function open() {
    window.dispatchEvent(new Event("open-composer"));
    document.getElementById("composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <Button type="button" onClick={open}>
      Create a Post
    </Button>
  );
}
