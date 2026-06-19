import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SectionCard } from '../SectionCard';
import { Text } from 'react-native';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      background: '#ffffff',
      foreground: '#09090b',
      border: '#e2e8f0',
      card: '#ffffff',
      mutedForeground: '#64748b',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    radius: {
      lg: 8,
    },
    typography: {
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
      },
      fontWeights: {
        bold: '700',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        elevation: 1,
      },
    },
  }),
}));

describe('SectionCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with title and children', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SectionCard title="Informasi Aset">
          <Text>Detail aset di sini</Text>
        </SectionCard>
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const titleInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Informasi Aset'
    );
    expect(titleInstance).toBeTruthy();

    const childInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Detail aset di sini'
    );
    expect(childInstance).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SectionCard title="Informasi Aset" subtitle="Sub-judul aset">
          <Text>Content</Text>
        </SectionCard>
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const subtitleInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Sub-judul aset'
    );
    expect(subtitleInstance).toBeTruthy();
  });

  it('renders action component when provided', () => {
    const DummyAction = () => <Text>Edit</Text>;
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SectionCard
          title="Informasi Aset"
          action={<DummyAction />}
        >
          <Text>Content</Text>
        </SectionCard>
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const actionInstance = tree.root.findByType(DummyAction);
    expect(actionInstance).toBeTruthy();
  });
});
