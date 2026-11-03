import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { tradeSchema } from "./engine";
import {
  newSession,
  tick,
  type Session,
  type Mode,
  type Quote,
  type Symbol,
} from "./engine";
const symbolSchema = z.enum(["NVDA", "TSLA", "AAPL", "META"]);
const num = z.number().finite(),
  positive = num.positive();
export const sessionSchema = z.object({
  cash: num.nonnegative(),
  positions: z.array(
    tradeSchema.extend({
      id: z.string(),
      entry: positive,
      quantity: positive,
      openingFee: num.nonnegative(),
      funding: num,
      openedAt: num,
      lastFunding: num,
      fundingInterval: positive,
      fundingRate: num,
    }),
  ),
  orders: z.array(
    tradeSchema.extend({
      id: z.string(),
      createdAt: num,
      reserve: positive,
      limit: positive,
    }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      time: num,
      symbol: symbolSchema,
      side: z.enum(["long", "short"]),
      kind: z.string(),
      price: positive,
      quantity: positive,
      pnl: num,
      fee: num,
      funding: num,
      margin: positive,
      entry: positive,
      leverage: positive,
    }),
  ),
  lastTicks: z.record(z.string(), num),
});
const persistedSchema = z.object({
  mode: z.enum(["scenario", "live"]),
  symbol: symbolSchema,
  currency: z.enum(["INR", "USD"]),
  favorites: z.array(symbolSchema),
  sessions: z.object({ scenario: sessionSchema, live: sessionSchema }),
  scenario: z.enum(["steady", "short", "funding", "shock"]),
  step: num.int().min(0).max(120),
  speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  saved: z.array(z.string()).max(12),
});
export let storageRecovered = false;
const storage = {
  getItem: (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) JSON.parse(raw);
      return raw;
    } catch {
      storageRecovered = true;
      try {
        localStorage.removeItem(key);
      } catch {}
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      window.dispatchEvent(new CustomEvent("mocha-storage-warning"));
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
interface State {
  mode: Mode;
  symbol: Symbol;
  currency: "INR" | "USD";
  favorites: Symbol[];
  sessions: Record<Mode, Session>;
  scenario: string;
  step: number;
  playing: boolean;
  speed: number;
  saved: string[];
  set: (value: Partial<State>) => void;
  update: (fn: (s: Session) => Session) => void;
  quote: (q: Quote, mode: Mode) => void;
  reset: () => void;
}
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      mode: "scenario",
      symbol: "NVDA",
      currency: "INR",
      favorites: ["NVDA", "TSLA"],
      sessions: { scenario: newSession(), live: newSession() },
      scenario: "steady",
      step: 0,
      playing: false,
      speed: 1,
      saved: [],
      set: (value) => set(value),
      update: (fn) =>
        set((s) => ({
          sessions: { ...s.sessions, [s.mode]: fn(s.sessions[s.mode]) },
        })),
      quote: (q, mode) => {
        const current = get().sessions[mode];
        if (!current.positions.length && !current.orders.length) return;
        const next = tick(current, q);
        if (next !== current)
          set((s) => ({ sessions: { ...s.sessions, [mode]: next } }));
      },
      reset: () =>
        set((s) => ({
          sessions: { ...s.sessions, [s.mode]: newSession() },
          ...(s.mode === "scenario" ? { step: 0, playing: false } : {}),
        })),
    }),
    {
      name: "mocha-practice-v1",
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        mode: s.mode,
        symbol: s.symbol,
        currency: s.currency,
        favorites: s.favorites,
        sessions: s.sessions,
        scenario: s.scenario,
        step: s.step,
        speed: s.speed,
        saved: s.saved,
      }),
      merge: (persisted, current) => {
        if (!persisted) return current;
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) {
          storageRecovered = true;
          return current;
        }
        return { ...current, ...parsed.data, playing: false };
      },
    },
  ),
);
