"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/?auth=register");
  }, [router]);

  return null;
}
