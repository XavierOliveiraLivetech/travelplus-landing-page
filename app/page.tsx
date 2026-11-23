import { ViewTransition } from "react";
import { SiteContent } from "./SiteContent";

export default function Home() {
  return (
    // Homepage enters from the left and leaves to the left (towards /aderir it slides out left).
    <ViewTransition enter="page-slide-from-left" exit="page-slide-to-left" default="none">
      <SiteContent />
    </ViewTransition>
  );
}
