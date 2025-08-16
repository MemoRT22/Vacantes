import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { publicRouter } from '../router/PublicRouter'

export function PublicSite() {
  return <RouterProvider router={publicRouter} />
}