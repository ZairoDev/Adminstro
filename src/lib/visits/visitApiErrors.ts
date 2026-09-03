import { NextResponse } from "next/server";
import {
  VisitAccessError,
  VisitNotFoundError,
  VisitTransitionError,
} from "@/lib/visits/visitStatus";

export function handleVisitServiceError(error: unknown) {
  if (error instanceof VisitNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof VisitAccessError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof VisitTransitionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
