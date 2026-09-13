// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/mocks/server"
import { ChannelSettingsForm } from "../channel-settings-form"

const baseChannel = {
  nickname: "techmaster2024",
  name: "TechMaster Studio",
  description: "A great channel",
  updated_at: "2026-09-12T00:00:00.000Z",
}

function envelope(statusCode: number, error: string, message: string) {
  return { statusCode, error, message, code: null }
}

describe("<ChannelSettingsForm />", () => {
  it("submits the typed payload to PATCH /api/channels/me and shows the confirmation", async () => {
    const user = userEvent.setup()
    const received: Record<string, unknown>[] = []
    server.use(
      http.patch("/api/channels/me", async ({ request }) => {
        received.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ ...baseChannel, name: "New Name" }, { status: 200 })
      })
    )

    render(<ChannelSettingsForm channel={baseChannel} />)
    await user.clear(screen.getByLabelText("Channel Name"))
    await user.type(screen.getByLabelText("Channel Name"), "New Name")
    await user.click(screen.getByRole("button", { name: "Save Changes" }))

    expect(await screen.findByText("Channel updated")).toBeInTheDocument()
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ name: "New Name" })
  })

  it("maps CHANNEL_NICKNAME_TAKEN to an inline error on the nickname field", async () => {
    const user = userEvent.setup()
    server.use(
      http.patch("/api/channels/me", () =>
        HttpResponse.json(
          envelope(409, "CHANNEL_NICKNAME_TAKEN", "Nickname already taken"),
          { status: 409 }
        )
      )
    )

    render(<ChannelSettingsForm channel={baseChannel} />)
    await user.click(screen.getByRole("button", { name: "Save Changes" }))

    expect(
      await screen.findByText("This nickname is already taken")
    ).toBeInTheDocument()
    expect(screen.queryByText("Channel updated")).not.toBeInTheDocument()
  })

  it("maps VALIDATION_ERROR to an inline form-level error", async () => {
    const user = userEvent.setup()
    server.use(
      http.patch("/api/channels/me", () =>
        HttpResponse.json(envelope(400, "VALIDATION_ERROR", "Validation failed"), {
          status: 400,
        })
      )
    )

    render(<ChannelSettingsForm channel={baseChannel} />)
    await user.click(screen.getByRole("button", { name: "Save Changes" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Validation failed")
  })

  it("blocks submit with an invalid nickname format and fires no request", async () => {
    const user = userEvent.setup()
    const onCall = vi.fn()
    server.use(
      http.patch("/api/channels/me", () => {
        onCall()
        return HttpResponse.json(baseChannel, { status: 200 })
      })
    )

    render(<ChannelSettingsForm channel={baseChannel} />)
    await user.clear(screen.getByLabelText("Nickname"))
    await user.type(screen.getByLabelText("Nickname"), "Invalid Nickname!")

    expect(
      await screen.findByText(
        "Nickname can only contain lowercase letters, numbers, and underscores"
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled()
    expect(onCall).not.toHaveBeenCalled()
  })

  it("blocks submit when the channel name is cleared", async () => {
    const user = userEvent.setup()
    const onCall = vi.fn()
    server.use(
      http.patch("/api/channels/me", () => {
        onCall()
        return HttpResponse.json(baseChannel, { status: 200 })
      })
    )

    render(<ChannelSettingsForm channel={baseChannel} />)
    await user.clear(screen.getByLabelText("Channel Name"))
    await user.click(screen.getByRole("button", { name: "Save Changes" }))

    expect(await screen.findByText("Channel name is required")).toBeInTheDocument()
    expect(onCall).not.toHaveBeenCalled()
  })

  it("hides the confirmation once the user edits the form again after saving", async () => {
    const user = userEvent.setup()
    server.use(
      http.patch("/api/channels/me", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...baseChannel, ...body }, { status: 200 })
      })
    )

    render(<ChannelSettingsForm channel={baseChannel} />)
    await user.clear(screen.getByLabelText("Channel Name"))
    await user.type(screen.getByLabelText("Channel Name"), "New Name")
    await user.click(screen.getByRole("button", { name: "Save Changes" }))
    expect(await screen.findByText("Channel updated")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Channel Name"), " again")

    expect(screen.queryByText("Channel updated")).not.toBeInTheDocument()
  })

  it("resets the form to the original values on Cancel", async () => {
    const user = userEvent.setup()
    render(<ChannelSettingsForm channel={baseChannel} />)

    const nameInput = screen.getByLabelText("Channel Name")
    await user.clear(nameInput)
    await user.type(nameInput, "Something Else")
    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(nameInput).toHaveValue(baseChannel.name)
  })
})
