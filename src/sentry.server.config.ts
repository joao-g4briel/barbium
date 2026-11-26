import * as Sentry from "@sentry/nextjs";
import { OPCOES_SENTRY } from "./lib/sentry-privacidade";

// Sentry no servidor (Node). Carregado por src/instrumentation.ts.
Sentry.init(OPCOES_SENTRY);
