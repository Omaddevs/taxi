// Who a passenger (bot) order is for: "Ayollar uchun taxi" (female drivers only) or the
// passenger's gender. Same palette as the website's driver section.
export const PASSENGER_GENDER_LABEL: Record<string, string> = {
  MALE: '👨 Erkak yo‘lovchi',
  FEMALE: '👩 Ayol yo‘lovchi',
  COUPLE: '👫 Er-xotin / oila',
}

const GENDER_CLASS: Record<string, string> = {
  MALE: 'bg-blue-50 text-blue-600',
  FEMALE: 'bg-pink-50 text-pink-600',
  COUPLE: 'bg-violet-50 text-violet-600',
}

export function OrderAudienceBadge({
  womenOnly,
  gender,
}: {
  womenOnly?: boolean
  gender?: string | null
}) {
  if (womenOnly) {
    return (
      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-[#f5559a] to-[#ff7eb3] px-2.5 py-0.5 text-xs font-bold text-white">
        🌸 Ayollar uchun
      </span>
    )
  }
  if (!gender || !PASSENGER_GENDER_LABEL[gender]) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${GENDER_CLASS[gender]}`}>
      {PASSENGER_GENDER_LABEL[gender]}
    </span>
  )
}
