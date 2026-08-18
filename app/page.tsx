import { redirect } from 'next/navigation'

export default function Page() {
  // The MCQ game is a self-contained HTML/CSS/JS page served from /public.
  redirect('/quiz.html')
}
