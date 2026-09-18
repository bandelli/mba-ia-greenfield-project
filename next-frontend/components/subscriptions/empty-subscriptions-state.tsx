function EmptySubscriptionsState() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h2 className="text-h3 text-foreground">No subscriptions yet</h2>
      <p className="text-body-md text-muted-foreground">
        You haven&apos;t subscribed to any channel yet.
      </p>
    </div>
  )
}

export { EmptySubscriptionsState }
