import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App';
import { clearPlanFromStorage, loadPlanFromStorage } from '../src/utils/storage';
import { getTodayDateString, addDays } from '../src/utils/dates';

describe('End-to-End User Journey: Create -> Generate -> Review -> Edit -> Track -> Persist -> Export', () => {
  beforeEach(() => {
    clearPlanFromStorage();

    // Mock fetch for health and AI proposal endpoints
    vi.stubGlobal('fetch', vi.fn((url: string, _options?: RequestInit) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'ok',
            liveAIConfigured: true,
            mode: 'live_verified',
            statusLabel: 'Live Gemini Verified',
            model: 'gemini-2.5-flash',
            notice: 'Live AI Active',
            verifiedOperations: {
              proposal: true,
              budgetReduction: true,
              ideas: true,
            },
          }),
        });
      }

      if (url.includes('/api/ai/proposal')) {
        const today = getTodayDateString();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            proposal: {
              summary: 'A refined 60th birthday jubilee celebration in Hyderabad.',
              themeIdeas: ['Diamond Jubilee Elegance', 'Nawabi Twilight'],
              activityIdeas: ['Live Ghazal Concert', 'Grandchildren Memory Tribute'],
              budgetAllocations: [
                { category: 'Banquets & Lighting', plannedAmount: 150000, notes: 'AC hall and foyer' },
                { category: 'Hyderabadi Gourmet Catering', plannedAmount: 180000, notes: 'Multi-course vegetarian feast' },
                { category: 'Contingency & Reserve (17.5%)', plannedAmount: 70000, notes: 'Buffer', isContingency: true },
              ],
              tasks: [
                { title: 'Sign banquet hall contract', category: 'Venue', dueDate: addDays(today, 10), isCritical: true },
                { title: 'Finalize ghazal artist repertoire', category: 'Entertainment', dueDate: addDays(today, 20) },
              ],
              vendorChecklists: [
                { category: 'Venue', items: ['Step-free ramp verified', 'AC backup checked'] },
              ],
              assumptionsAndLimitations: ['Directional planning estimate.'],
              generatedAt: new Date().toISOString(),
              isSampleMode: false,
              isLiveVerified: true,
              modelIdentifier: 'gemini-2.5-flash (Mocked E2E)',
            },
            isSampleMode: false,
            isLiveVerified: true,
            modelIdentifier: 'gemini-2.5-flash (Mocked E2E)',
          }),
        });
      }

      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    }));
  });

  it('completes the entire end-to-end planning cycle smoothly', async () => {
    // 1. Initial Render
    render(<App />);
    expect(screen.getByText('GatherWise')).toBeInTheDocument();

    // 2. Open Event Setup Modal
    const editEventBtn = screen.getByTitle(/Click to edit event details/i);
    fireEvent.click(editEventBtn);

    expect(screen.getByText(/Step 1: Event Specification/i)).toBeInTheDocument();

    // Fill in new event details
    const nameInput = screen.getByLabelText(/Event Name/i);
    fireEvent.change(nameInput, { target: { value: "Sunita's 60th Diamond Jubilee" } });

    const locationInput = screen.getByLabelText(/City \/ General Location/i);
    fireEvent.change(locationInput, { target: { value: 'Hyderabad, Telangana' } });

    const budgetInput = screen.getByLabelText(/Total Budget Limit/i);
    fireEvent.change(budgetInput, { target: { value: '400000' } });

    const form = screen.getByRole('dialog').querySelector('form')!;
    fireEvent.submit(form);

    // Verify event title updated in header/overview
    await waitFor(() => {
      expect(screen.getAllByText(/Sunita's 60th Diamond Jubilee/i).length).toBeGreaterThan(0);
    });

    // 3. Generate Proposal
    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    fireEvent.click(generateBtn);

    // If privacy notice appears, accept it
    const acceptPrivacyBtn = screen.queryByRole('button', { name: /I Understand & Continue/i });
    if (acceptPrivacyBtn) {
      fireEvent.click(acceptPrivacyBtn);
    }

    // 4. Verify Proposal Review Modal appears
    await waitFor(() => {
      expect(screen.getByText(/AI Event Strategy & Master Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/A refined 60th birthday jubilee celebration in Hyderabad/i)).toBeInTheDocument();
    });

    // 5. Apply Proposal to Workspace
    const applyProposalBtn = screen.getByRole('button', { name: /Apply Proposal to Workspace/i });
    fireEvent.click(applyProposalBtn);

    // If overwrite confirmation appears, confirm it
    const confirmApplyBtn = screen.queryByRole('button', { name: /Yes, Apply Proposal/i });
    if (confirmApplyBtn) {
      fireEvent.click(confirmApplyBtn);
    }

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/AI Event Strategy & Master Plan/i)).not.toBeInTheDocument();
    });

    // 6. Verify Budget Allocations in Budget Planner
    fireEvent.click(screen.getByRole('button', { name: /Budget Planner/i }));
    expect(screen.getAllByText(/Hyderabadi Gourmet Catering/i).length).toBeGreaterThan(0);

    // 7. Verify Timeline & Complete a Task
    fireEvent.click(screen.getByRole('button', { name: /Timeline & Tasks/i }));
    expect(screen.getByText(/Sign banquet hall contract/i)).toBeInTheDocument();

    const taskCheckboxes = screen.getAllByRole('button', { name: /Mark task/i });
    expect(taskCheckboxes.length).toBeGreaterThan(0);
    fireEvent.click(taskCheckboxes[0]); // Complete first task

    // 8. Add a Vendor in Vendor Tracker
    fireEvent.click(screen.getByRole('button', { name: /Vendor Tracker/i }));
    const vendorNameInput = screen.getByLabelText(/Vendor Name/i);
    fireEvent.change(vendorNameInput, { target: { value: 'Taj Banjara Palace' } });

    const quoteInput = screen.getByLabelText(/Quote \(INR\)/i);
    fireEvent.change(quoteInput, { target: { value: '145000' } });

    const recordVendorBtn = screen.getByRole('button', { name: /Record Vendor/i });
    fireEvent.click(recordVendorBtn);

    expect(screen.getByText('Taj Banjara Palace')).toBeInTheDocument();

    // 9. Verify LocalStorage has persisted the plan
    const stored = loadPlanFromStorage();
    expect(stored.plan).not.toBeNull();
    expect(stored.plan?.details.name).toBe("Sunita's 60th Diamond Jubilee");
    expect(stored.plan?.tasks[0].completed).toBe(true);
    expect(stored.plan?.vendors.some(v => v.name === 'Taj Banjara Palace')).toBe(true);

    // 10. Export JSON via Event actions menu
    fireEvent.click(screen.getByRole('button', { name: /Event actions/i }));
    const exportBtn = screen.getByRole('button', { name: /Export JSON/i });
    expect(exportBtn).toBeInTheDocument();
    // Fire export click (does not throw)
    fireEvent.click(exportBtn);
  });
});
