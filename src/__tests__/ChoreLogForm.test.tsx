/**
 * Tests for ChoreLogForm component
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChoreLogForm from "@/components/ChoreLogForm";

const mockChores = [
  { id: "chore1", name: "皿洗い", points: 10, category: { id: "cat1", name: "キッチン" } },
  { id: "chore2", name: "掃除機", points: 15, category: null },
  { id: "chore3", name: "洗濯", points: 20, category: { id: "cat1", name: "キッチン" } },
];

const mockMembers = [
  { id: "user1", name: "Alice", image: null },
  { id: "user2", name: "Bob", image: null },
];

const mockOnSuccess = jest.fn();

describe("ChoreLogForm", () => {
  beforeEach(() => {
    mockOnSuccess.mockClear();
    global.fetch = jest.fn();
  });

  it("shows empty state when no chores", () => {
    render(
      <ChoreLogForm
        chores={[]}
        members={mockMembers}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );
    expect(screen.getByText(/家事が登録されていません/)).toBeInTheDocument();
  });

  it("renders chore buttons", () => {
    render(
      <ChoreLogForm
        chores={mockChores}
        members={mockMembers}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );
    expect(screen.getByText("皿洗い")).toBeInTheDocument();
    expect(screen.getByText("掃除機")).toBeInTheDocument();
    expect(screen.getByText("洗濯")).toBeInTheDocument();
  });

  it("shows points on each chore button", () => {
    render(
      <ChoreLogForm
        chores={mockChores}
        members={mockMembers}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );
    expect(screen.getByText("+10pt")).toBeInTheDocument();
    expect(screen.getByText("+15pt")).toBeInTheDocument();
    expect(screen.getByText("+20pt")).toBeInTheDocument();
  });

  it("shows member selector when multiple members", () => {
    render(
      <ChoreLogForm
        chores={mockChores}
        members={mockMembers}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("does not show member selector for single member", () => {
    render(
      <ChoreLogForm
        chores={mockChores}
        members={[mockMembers[0]]}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );
    // Alice would not appear in member selector (only 1 member)
    expect(screen.queryByText("実施した人")).not.toBeInTheDocument();
  });

  it("calls API and onSuccess when chore button clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ record: { id: "rec1", points: 10 } }),
    });

    render(
      <ChoreLogForm
        chores={mockChores}
        members={mockMembers}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.click(screen.getByText("皿洗い"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/chore-records",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("shows error when API call fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Family not found" }),
    });

    render(
      <ChoreLogForm
        chores={mockChores}
        members={mockMembers}
        currentUserId="user1"
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.click(screen.getByText("皿洗い"));

    await waitFor(() => {
      expect(screen.getByText("Family not found")).toBeInTheDocument();
    });
  });
});
