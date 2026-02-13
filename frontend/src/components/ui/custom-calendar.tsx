"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  format,
  getYear,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  endOfMonth,
  setMonth,
  setYear,
  getMonth,
  isValid,
} from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface CustomCalendarProps {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
}

export function CustomCalendar({
  className,
  selected,
  onSelect,
  disabled,
  fromYear = 1900,
  toYear = 2100,
}: CustomCalendarProps) {
  // Initialize viewDate to selected date or today
  const [viewDate, setViewDate] = React.useState(
    selected && isValid(selected) ? selected : new Date(),
  );

  // Sync viewDate if selected changes externally (optional, but good for UX)
  React.useEffect(() => {
    if (selected && isValid(selected)) {
      setViewDate(selected);
    }
  }, [selected]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(addMonths(viewDate, -1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(addMonths(viewDate, 1));
  };

  const currentYear = getYear(viewDate);
  const currentMonth = getMonth(viewDate);

  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i,
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate(setYear(viewDate, newYear));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(setMonth(viewDate, newMonth));
  };

  // Generate days
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={cn("p-3 w-fit", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 space-x-2">
        {/* Navigation Buttons are absolute in the prompt design, but relative is safer for layout. 
            However, user wanted that specific look. Let's try to match the prompt's structural desires:
            Dropdowns in center/top, Arrows on sides.
        */}
        <button
          onClick={handlePrevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-2">
          <select
            value={currentMonth}
            onChange={handleMonthChange}
            className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={handleYearChange}
            className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week Day Labels */}
      <div className="flex mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2">
        {calendarDays.map((day, i) => {
          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          const isOutside = !isSameMonth(day, viewDate);
          const isDisabled = disabled ? disabled(day) : false;

          return (
            <div
              key={day.toString()}
              className="relative p-0 text-center text-sm focus-within:relative focus-within:z-20"
            >
              <button
                onClick={() => !isDisabled && onSelect && onSelect(day)}
                disabled={isDisabled}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  !isSelected && isToday && "bg-accent text-accent-foreground",
                  isOutside && "text-muted-foreground opacity-50",
                  isDisabled &&
                    "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                )}
              >
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
