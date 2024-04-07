'use client'

import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  value: null
}

export const routesSlice = createSlice({
  name: 'routesList',
  initialState,
  reducers: {
    updateRoutesList: (state, action) => {
      state.value = action.payload
    }
  }
})

export const { updateRoutesList } = routesSlice.actions

export default routesSlice.reducer
