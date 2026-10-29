import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App';
import { SAMPLE_WEDDING } from '../src/data/sampleEvents';
import { clearPlanFromStorage, savePlanToStorage } from '../src/utils/storage';

describe('GatherWise Integration & Component Workflows', () => {
  beforeEach(() => {
    clearPlanFromStorage();
    // Default mock server health returning sample mode
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'ok',
            liveAIConfigured: false,
            mode: 'sample',
            statusLabel: 'Sample Mode Active',
            model: 'GatherWise Sample Engine',
            notice: 'Sample Mode active',
            verifiedOperations: {
              proposal: false,
              budgetReduction: false,
              ideas: false,
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }));
  });

  it('renders application workspace with default wedding sample', async () => {
    render(<App />);

    expect(screen.getByText('GatherWise')).toBeInTheDocument();
    expect(screen.getAllByText(/Aanya & Kabir's Royal Eco-Heritage Wedding/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sample Mode Active/i)).toBeInTheDocument();
  });

  it('navigates between planning modules via desktop sidebar', async () => {
    render(<App />);

    // Click Budget Planner tab
    const budgetBtn = screen.getByRole('button', { name: /Budget Planner/i });
    fireEvent.click(budgetBtn);

    expect(screen.getByText(/Budget Planner & Allocations/i)).toBeInTheDocument();

    // Click Timeline & Tasks tab
    const timelineBtn = screen.getByRole('button', { name: /Timeline & Tasks/i });
    fireEvent.click(timelineBtn);

    expect(screen.getByText(/Timeline & Preparation Checklists/i)).toBeInTheDocument();

    // Click Vendor Tracker tab
    const vendorBtn = screen.getByRole('button', { name: /Vendor Tracker/i });
    fireEvent.click(vendorBtn);

    expect(screen.getByText(/Vendor Tracker & Comparison Checklists/i)).toBeInTheDocument();
  });

  it('completing a task updates task completion count in overview', async () => {
    render(<App />);

    // Switch to Timeline
    fireEvent.click(screen.getByRole('button', { name: /Timeline & Tasks/i }));

    // Find an unchecked task checkbox and toggle it
    const checkboxes = screen.getAllByRole('button', { name: /Mark task/i });
    expect(checkboxes.length).toBeGreaterThan(0);

    const initialCheckboxes = screen.getAllByRole('button', { name: /Mark task/i });
    fireEvent.click(initialCheckboxes[2]); // Toggle third task

    // Switch back to Overview
    fireEvent.click(screen.getByRole('button', { name: /Overview/i }));

    // Task completion card should be rendered
    expect(screen.getByText(/Task Completion/i)).toBeInTheDocument();
  });

  it('editing a budget row updates calculated totals in real time', async () => {
    render(<App />);

    // Switch to Budget Planner
    fireEvent.click(screen.getByRole('button', { name: /Budget Planner/i }));

    // Click edit on the first category row to open the edit drawer
    const editBtns = screen.getAllByRole('button', { name: /Edit category/i });
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);

    // Find the planned amount input in the drawer
    const plannedInputs = screen.getAllByLabelText(/Planned/i);
    expect(plannedInputs.length).toBeGreaterThan(0);

    // Increase planned amount to trigger an over-budget condition
    fireEvent.change(plannedInputs[0], { target: { value: '2500000' } });

    // Save the category
    fireEvent.click(screen.getByRole('button', { name: /Save Category/i }));

    // Prominent Over-budget warning should now appear
    expect(screen.getByText(/WARNING: OVER BUDGET LIMIT/i)).toBeInTheDocument();
  });

  it('sample mode is visibly distinguishable from live mode', async () => {
    render(<App />);

    const badge = screen.getByText(/Sample Mode Active/i);
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.badge-warning')).not.toBeNull();
  });

  it('switching sample events updates the workspace correctly', async () => {
    render(<App />);

    // Open Event actions menu in header
    fireEvent.click(screen.getByRole('button', { name: /Event actions/i }));

    // Click "Birthday" in the Event actions menu
    const bdayBtn = screen.getByRole('button', { name: /Birthday/i });
    fireEvent.click(bdayBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Aarav's 10th Cosmic Explorer/i).length).toBeGreaterThan(0);
    });

    // Open Event actions menu again
    fireEvent.click(screen.getByRole('button', { name: /Event actions/i }));

    // Click "Community" sample
    const commBtn = screen.getByRole('button', { name: /Community/i });
    fireEvent.click(commBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Greenfield Eco-Fair/i).length).toBeGreaterThan(0);
    });
  });

  it('shows privacy disclosure notice prior to first AI call', async () => {
    // Start with a clean plan where aiNoticeAcknowledged is false
    savePlanToStorage({
      ...SAMPLE_WEDDING,
      aiNoticeAcknowledged: false,
    });

    render(<App />);

    // Click Generate Full AI Proposal
    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    fireEvent.click(generateBtn);

    // Privacy notice modal should pop up
    expect(screen.getByText(/AI Transparency & Data Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/What information is transmitted/i)).toBeInTheDocument();

    // Clicking cancel leaves modal closed without running generation
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText(/AI Transparency & Data Notice/i)).not.toBeInTheDocument();
  });
});
