// Query keys as constants - avoids typos and makes invalidation explicit
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMatch,
  getMatches,
  getSimulatorStatus,
  startSimulator,
  stopAllSimulators,
  stopSimulator,
} from "../services/matches.js";

export const QUERY_KEYS = {
  matches: ["matches"],
  simulatorStatus: ["simulator-status"],
};

// ========== Queries ====================

export function useMatches() {
  return useQuery({
    queryKey: QUERY_KEYS.matches,
    queryFn: () => getMatches(),
    refetchInterval: 15_000,
    select: (res) => res.data ?? [],
  });
}

export function useSimulatorStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.simulatorStatus,
    queryFn: () => getSimulatorStatus(),
    refetchInterval: 10_000,
    // Expose the set of active IDs directly so consumers don't need
    // to derive it
    select: (res) => ({
      active: res.active,
      activeSimulations: res.activeSimulations,
      // Set for 0(1) lookup in MatchCard
      activeMatchIds: new Set(res.activeMatchIds ?? []),
    }),
  });
}

// ============= Mutations ==================

export function useCreateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMatch,
    onSuccess: async () => {
      // Refetch the matches list immediately after creating one
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
    },
  });
}

export function useStartSimulator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startSimulator,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.simulatorStatus,
      });
      // Optimistically refetch matches so status badge updates
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
    },
  });
}

export function useStopSimulator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stopSimulator,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.simulatorStatus,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
    },
  });
}

export function useStopAllSimulators() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stopAllSimulators,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.simulatorStatus,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
    },
  });
}
