'use client'

import { configureStore } from '@reduxjs/toolkit'
import listReducer from './Features/listSlice'
import recountReducer from './Features/recountSlice'
import resultsReducer from './Features/resultsCounterSlice'
import routesReducer from './Features/routesSlice'

export const store = configureStore({
  reducer: {
    list: listReducer,
    routes: routesReducer,
    results: resultsReducer,
    recount: recountReducer
  }
})
