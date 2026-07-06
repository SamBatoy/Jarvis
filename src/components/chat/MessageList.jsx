import clsx from 'clsx'
import ProposalCard from './ProposalCard'

export default function MessageList({ messages }) {
  return (
    <div aria-live="polite" aria-atomic="false" className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="text-sm text-neutral-500">
          Ask Jarvis about your schedule, todos, deadlines, or say something like “study for the chem exam on the
          20th”.
        </p>
      )}
      {messages.map((m, i) => (
        <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
          <div
            className={clsx(
              'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
              m.role === 'user'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800'
            )}
          >
            {m.content}
            {m.proposal && <ProposalCard proposal={m.proposal} />}
          </div>
        </div>
      ))}
    </div>
  )
}
