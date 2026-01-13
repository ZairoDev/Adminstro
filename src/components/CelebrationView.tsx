"use client";

import React from "react";
import { X, Cake, Calendar } from "lucide-react";
import { BirthdayEvent, AnniversaryEvent } from "@/util/getTodaysEvents";

interface CelebrationViewProps {
  birthdays: BirthdayEvent[];
  anniversaries: AnniversaryEvent[];
  onDismiss: () => void;
}

/**
 * CelebrationView Component
 * Displays birthday and work anniversary celebrations with a clean, responsive design
 */
export const CelebrationView: React.FC<CelebrationViewProps> = ({
  birthdays,
  anniversaries,
  onDismiss,
}) => {
  const currentUserBirthday = birthdays.find((b) => b.isCurrentUser);
  const currentUserAnniversary = anniversaries.find((a) => a.isCurrentUser);
  const otherBirthdays = birthdays.filter((b) => !b.isCurrentUser);
  const otherAnniversaries = anniversaries.filter((a) => !a.isCurrentUser);

  const hasMultipleEvents = birthdays.length + anniversaries.length > 1;
  const showGroupedView = hasMultipleEvents || (birthdays.length > 0 && anniversaries.length > 0);

  // Render single current user birthday
  if (currentUserBirthday && !showGroupedView) {
    return (
      <div className="relative p-6 rounded-lg bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 dark:from-pink-950/40 dark:via-purple-950/40 dark:to-rose-950/40 border-2 border-pink-300 dark:border-pink-700 shadow-lg">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors z-10"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-4">
          <Cake className="w-12 h-12 text-pink-600 dark:text-pink-400 flex-shrink-0 animate-bounce" />
          <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 animate-pulse">
            🎉 Happy Birthday, {currentUserBirthday.firstName}! 🎉
          </p>
        </div>
      </div>
    );
  }

  // Render single current user anniversary
  if (currentUserAnniversary && !showGroupedView) {
    return (
      <div className="relative p-6 rounded-lg bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border-2 border-purple-300 dark:border-purple-700 shadow-lg">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors z-10"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-4">
          <Calendar className="w-12 h-12 text-purple-600 dark:text-purple-400 flex-shrink-0 animate-pulse" />
          <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 animate-pulse">
            🎊 Happy Work Anniversary, {currentUserAnniversary.firstName}! {currentUserAnniversary.years} years with us 🎊
          </p>
        </div>
      </div>
    );
  }

  // Render single other person's birthday
  if (otherBirthdays.length === 1 && anniversaries.length === 0 && !currentUserBirthday) {
    return (
      <div className="relative p-6 rounded-lg bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 dark:from-pink-950/40 dark:via-purple-950/40 dark:to-rose-950/40 border-2 border-pink-300 dark:border-pink-700 shadow-lg">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors z-10"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-4">
          <Cake className="w-12 h-12 text-pink-600 dark:text-pink-400 flex-shrink-0 animate-bounce" />
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            🎂 It&apos;s {otherBirthdays[0].firstName}&apos;s birthday today — make them feel special! 🎂
          </p>
        </div>
      </div>
    );
  }

  // Render single other person's anniversary
  if (otherAnniversaries.length === 1 && birthdays.length === 0 && !currentUserAnniversary) {
    return (
      <div className="relative p-6 rounded-lg bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border-2 border-purple-300 dark:border-purple-700 shadow-lg">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors z-10"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-4">
          <Calendar className="w-12 h-12 text-purple-600 dark:text-purple-400 flex-shrink-0 animate-pulse" />
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            🎊 Today is {otherAnniversaries[0].firstName}&apos;s work anniversary — {otherAnniversaries[0].years} years with us. Send your wishes! 👏
          </p>
        </div>
      </div>
    );
  }

  // Render grouped view for multiple events
  return (
    <div className="relative p-6 rounded-lg bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 dark:from-pink-950/40 dark:via-purple-950/40 dark:to-rose-950/40 border-2 border-pink-300 dark:border-pink-700 shadow-lg">
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors z-10"
        aria-label="Close celebration"
      >
        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Cake className="w-8 h-8 text-pink-600 dark:text-pink-400 flex-shrink-0" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            🎉 Celebrations Today
          </h3>
        </div>

        {/* Birthdays Section */}
        {birthdays.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-2">
              <Cake className="w-5 h-5" />
              Birthdays
            </h4>
            <div className="pl-7 space-y-1">
              {birthdays.slice(0, 5).map((bday, idx) => (
                <p
                  key={bday.employeeId}
                  className={`text-base ${
                    bday.isCurrentUser
                      ? "font-bold text-pink-600 dark:text-pink-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {bday.isCurrentUser ? "🎉 " : "🎂 "}
                  {bday.isCurrentUser ? (
                    <span className="underline">Happy Birthday, {bday.firstName}!</span>
                  ) : (
                    <span>{bday.firstName}&apos;s birthday</span>
                  )}
                </p>
              ))}
              {birthdays.length > 5 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  +{birthdays.length - 5} more birthday{birthdays.length - 5 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Anniversaries Section */}
        {anniversaries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Work Anniversaries
            </h4>
            <div className="pl-7 space-y-1">
              {anniversaries.slice(0, 5).map((anniv, idx) => (
                <p
                  key={anniv.employeeId}
                  className={`text-base ${
                    anniv.isCurrentUser
                      ? "font-bold text-purple-600 dark:text-purple-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {anniv.isCurrentUser ? "🎊 " : "🎉 "}
                  {anniv.isCurrentUser ? (
                    <span className="underline">
                      Happy Work Anniversary, {anniv.firstName}! {anniv.years} years
                    </span>
                  ) : (
                    <span>
                      {anniv.firstName}&apos;s {anniv.years} year{anniv.years !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              ))}
              {anniversaries.length > 5 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  +{anniversaries.length - 5} more anniversary
                  {anniversaries.length - 5 !== 1 ? "ies" : ""}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

