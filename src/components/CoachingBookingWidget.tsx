import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, CalendarDays, ArrowRight, Check } from "lucide-react";
import { DURATION_PRESETS } from "@/components/admin/AdminActivites";

/* ─── French locale helpers ─── */
const FR_DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/* ─── Shared type (imported by GuestCheckoutDialog & ProductPage) ─── */
export type CoachingPreselected = {
  durationMinutes: number;
  durationLabel: string;
  date: Date;
  time: string;      // "HH:MM" — empty string when no slots configured
  price: number;
};

type Props = {
  extraConfig: Record<string, any>;
  currency: string | null;
  isClosed?: boolean;
  onBook: (preselected: CoachingPreselected) => void;
};

export function CoachingBookingWidget({ extraConfig: cfg, currency, isClosed, onBook }: Props) {
  /* ─── Config from extra_config ─── */
  const durations = DURATION_PRESETS.filter(
    (p) => (cfg.durations as Record<string, { enabled: boolean; price: number }>)?.[p.minutes]?.enabled
  );
  const availableFrDays: number[] = cfg.available_days ?? [0, 1, 2, 3, 4]; // 0=Mon…6=Sun (FR)
  const blockedDatesSet = new Set<string>(cfg.blocked_dates ?? []);
  const timeStart: string = cfg.available_time_start ?? "09:00";
  const timeEnd: string = cfg.available_time_end ?? "18:00";

  /* ─── Selection state ─── */
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Reset time when duration or date changes
  useEffect(() => { setSelectedTime(null); }, [selectedDuration, selectedDate]);

  /* ─── Helpers ─── */
  const isDateAvailable = (date: Date): boolean => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    const frIdx = (date.getDay() + 6) % 7; // JS Sun=0 → FR Mon=0
    if (!availableFrDays.includes(frIdx)) return false;
    const dateStr = date.toISOString().split("T")[0];
    if (blockedDatesSet.has(dateStr)) return false;
    return true;
  };

  const timeSlots: string[] = (() => {
    if (!selectedDuration) return [];
    const parseTime = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const start = parseTime(timeStart);
    const end = parseTime(timeEnd);
    const slots: string[] = [];
    for (let t = start; t + selectedDuration <= end; t += 30) {
      const h = Math.floor(t / 60); const m = t % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return slots;
  })();

  const calendarDays: (Date | null)[] = (() => {
    const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstFrIdx = (new Date(year, month, 1).getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstFrIdx; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  })();

  const selectedPrice: number | null =
    selectedDuration !== null && cfg.durations
      ? (cfg.durations as Record<string, { enabled: boolean; price: number }>)[selectedDuration]?.price ?? null
      : null;

  // All required: date + duration + (time if slots exist)
  const canBook =
    selectedDate !== null &&
    selectedDuration !== null &&
    (timeSlots.length === 0 || selectedTime !== null);

  const prevMonth = () => {
    setCalendarMonth((m) => {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const prev = new Date(m.getFullYear(), m.getMonth() - 1, 1);
      return prev < new Date(now.getFullYear(), now.getMonth(), 1) ? m : prev;
    });
  };
  const nextMonth = () => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const handleBook = () => {
    if (!canBook || !selectedDate || selectedDuration === null || selectedPrice === null) return;
    const durationLabel = DURATION_PRESETS.find((p) => p.minutes === selectedDuration)?.label ?? `${selectedDuration} min`;
    onBook({
      durationMinutes: selectedDuration,
      durationLabel,
      date: selectedDate,
      time: selectedTime ?? "",
      price: selectedPrice,
    });
  };

  if (durations.length === 0) return null;

  const stepDone = (step: 1 | 2 | 3) => {
    if (step === 1) return selectedDate !== null;
    if (step === 2) return selectedDuration !== null;
    if (step === 3) return timeSlots.length === 0 || selectedTime !== null;
    return false;
  };

  return (
    <div className="space-y-4">

      {/* ═══ STEP 1 : Calendar ═══ */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
            stepDone(1) ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          }`}>
            {stepDone(1) ? <Check className="h-3.5 w-3.5" /> : "1"}
          </span>
          <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-primary" /> Choisissez une date
          </h3>
          {selectedDate && (
            <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
              {selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        <div className="p-5 space-y-3">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-foreground">
              {FR_MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </span>
            <button type="button" onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {FR_DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground pb-1">{d}</div>
            ))}
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const available = isDateAvailable(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={!available || !!isClosed}
                  onClick={() => available && !isClosed && setSelectedDate(date)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                    ${isSelected ? "bg-primary text-primary-foreground shadow-md font-bold" : ""}
                    ${!isSelected && available && !isClosed ? "hover:bg-primary/10 text-foreground cursor-pointer" : ""}
                    ${!available ? "text-muted-foreground/30 cursor-not-allowed" : ""}
                    ${isToday && !isSelected ? "ring-2 ring-primary/40 font-semibold" : ""}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-1">
            <span className="font-medium">Disponible :</span>{" "}
            {availableFrDays.sort().map((i) => FR_DAYS_SHORT[i]).join(", ")}
            {" · "}{timeStart.replace(":", "h")}–{timeEnd.replace(":", "h")}
          </p>
        </div>
      </div>

      {/* ═══ STEP 2 : Duration + price ═══ */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
            stepDone(2) ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          }`}>
            {stepDone(2) ? <Check className="h-3.5 w-3.5" /> : "2"}
          </span>
          <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" /> Choisissez votre durée
          </h3>
          {selectedDuration && selectedPrice !== null && (
            <span className="ml-auto text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
              {selectedPrice.toLocaleString("fr-FR")} {currency || "FCFA"}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {durations.map((preset) => {
              const d = (cfg.durations as Record<string, { enabled: boolean; price: number }>)[preset.minutes];
              const isSelected = selectedDuration === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  disabled={!!isClosed}
                  onClick={() => !isClosed && setSelectedDuration(preset.minutes)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3.5 font-medium transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
                  }`}
                >
                  <span className="text-sm">{preset.label}</span>
                  <span className={`font-black text-lg leading-none ${isSelected ? "text-primary-foreground" : "text-primary"}`}>
                    {d.price.toLocaleString("fr-FR")}
                    <span className={`text-xs font-normal ml-1 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {currency || "FCFA"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ STEP 3 : Time slots (only once date + duration selected) ═══ */}
      {selectedDate !== null && selectedDuration !== null && timeSlots.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
              stepDone(3) ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
            }`}>
              {stepDone(3) ? <Check className="h-3.5 w-3.5" /> : "3"}
            </span>
            <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" /> Choisissez un créneau
            </h3>
            {selectedTime && (
              <span className="ml-auto text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                {selectedTime.replace(":", "h")}
              </span>
            )}
          </div>

          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`px-3.5 py-2 rounded-lg border text-sm font-semibold transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
                    }`}
                  >
                    {slot.replace(":", "h")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Summary + CTA ═══ */}
      <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all ${
        canBook
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border bg-card"
      }`}>
        <div className="min-w-0">
          {canBook && selectedDate && selectedDuration && selectedPrice !== null ? (
            <>
              <p className="text-xs text-muted-foreground mb-1">Votre séance</p>
              <p className="text-2xl font-black text-primary leading-none">
                {selectedPrice.toLocaleString("fr-FR")} {currency || "FCFA"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>⏱ {DURATION_PRESETS.find((p) => p.minutes === selectedDuration)?.label}</span>
                <span>📅 {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                {selectedTime && <span>🕐 {selectedTime.replace(":", "h")}</span>}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Réservez votre séance</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!selectedDate && !selectedDuration
                  ? "Sélectionnez une date et une durée"
                  : !selectedDate
                  ? "Sélectionnez une date"
                  : !selectedDuration
                  ? "Sélectionnez une durée"
                  : "Sélectionnez un créneau horaire"}
              </p>
            </>
          )}
        </div>

        <Button
          size="lg"
          disabled={!canBook || !!isClosed}
          onClick={handleBook}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shrink-0"
        >
          {isClosed ? "Complet" : "Réserver"}
          {!isClosed && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
