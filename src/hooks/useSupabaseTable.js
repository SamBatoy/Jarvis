import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// Shared CRUD hook factory for a Supabase table. Per-table hook files wrap
// this with their own query keys, default ordering, and filter shapes.
// Refetch-after-mutation: every mutation just invalidates the table's query
// key rather than patching the cache by hand.
//
// This factory itself calls no hooks — it just closes over the table name
// and returns hook functions. Those returned functions call the actual
// react-query hooks when a component invokes them.
export function useSupabaseTable(table) {
  const queryKey = [table]

  function useList(applyQuery, extraKey = []) {
    return useQuery({
      queryKey: [...queryKey, ...extraKey],
      queryFn: async () => {
        let query = supabase.from(table).select('*')
        if (applyQuery) query = applyQuery(query)
        const { data, error } = await query
        if (error) throw error
        return data
      },
    })
  }

  function useCreate() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (fields) => {
        const { data, error } = await supabase.from(table).insert(fields).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useCreateMany() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (rows) => {
        const { data, error } = await supabase.from(table).insert(rows).select()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useUpdate() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async ({ id, fields }) => {
        const { data, error } = await supabase.from(table).update(fields).eq('id', id).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useDelete() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (id) => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        return id
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  return { useList, useCreate, useCreateMany, useUpdate, useDelete }
}
