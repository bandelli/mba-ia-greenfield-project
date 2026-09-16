import { CommentItem, type CommentItemProps } from "./comment-item"

export type CommentListProps = {
  publicId: string
  items: Omit<CommentItemProps, "publicId">[]
}

function CommentList({ publicId, items }: CommentListProps) {
  if (items.length === 0) {
    return (
      <p className="text-body-md text-muted-foreground">
        No comments yet — be the first to comment
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => (
        <CommentItem key={item.id} {...item} publicId={publicId} />
      ))}
    </div>
  )
}

export { CommentList }
