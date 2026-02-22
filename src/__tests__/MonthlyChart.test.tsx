/**
 * Tests for MonthlyChart component
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MonthlyChart from "@/components/MonthlyChart";

// Mock recharts to avoid canvas issues in test environment
jest.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockRecords = [
  {
    id: "1",
    points: 10,
    date: "2024-01-15T10:00:00Z",
    user: { id: "user1", name: "Alice", image: null },
  },
  {
    id: "2",
    points: 20,
    date: "2024-01-16T10:00:00Z",
    user: { id: "user1", name: "Alice", image: null },
  },
  {
    id: "3",
    points: 15,
    date: "2024-01-17T10:00:00Z",
    user: { id: "user2", name: "Bob", image: null },
  },
];

describe("MonthlyChart", () => {
  it("shows empty state when no records", () => {
    render(<MonthlyChart records={[]} year={2024} month={1} />);
    expect(screen.getByText(/2024年1月の記録はまだありません/)).toBeInTheDocument();
  });

  it("renders chart when records exist", () => {
    render(<MonthlyChart records={mockRecords} year={2024} month={1} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("shows user names in summary", () => {
    render(<MonthlyChart records={mockRecords} year={2024} month={1} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("aggregates points correctly", () => {
    render(<MonthlyChart records={mockRecords} year={2024} month={1} />);
    // Alice has 10 + 20 = 30 points
    expect(screen.getByText("30pt")).toBeInTheDocument();
    // Bob has 15 points
    expect(screen.getByText("15pt")).toBeInTheDocument();
  });

  it("shows record count per user", () => {
    render(<MonthlyChart records={mockRecords} year={2024} month={1} />);
    expect(screen.getByText("2件")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });
});
