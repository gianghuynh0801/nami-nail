import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, parseISO, isSameDay } from 'date-fns'

export async function GET(request: Request) {
  try {
    const staffName = 'Test'
    const targetDateStr = '2026-01-20'

    const staff = await prisma.staff.findFirst({
      where: { name: { contains: staffName } },
      include: { schedules: true, salon: true }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' })
    }

    const date = parseISO(targetDateStr)
    const dayStart = startOfDay(date)
    
    // Logic from api/calendar/day/route.ts
    const specificSchedule = staff.schedules.find(sch => sch.date && isSameDay(sch.date, dayStart))
    const recurringSchedule = staff.schedules.find(sch => !sch.date && sch.dayOfWeek === date.getDay())
    const schedule = specificSchedule || recurringSchedule

    return NextResponse.json({
      staff: { name: staff.name, id: staff.id },
      salonId: staff.salonId,
      targetDate: targetDateStr,
      dayStart: dayStart.toISOString(),
      schedules: staff.schedules.map(s => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        date: s.date,
        dateISO: s.date ? s.date.toISOString() : null,
        startTime: s.startTime,
        endTime: s.endTime,
        isSpecificMatch: s.date ? isSameDay(s.date, dayStart) : false
      })),
      matchResult: {
        specific: specificSchedule || null,
        recurring: recurringSchedule || null,
        final: schedule || null
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack })
  }
}
