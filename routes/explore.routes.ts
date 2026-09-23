import express from 'express'
import { authenticate, requireSuperadmin } from '../middlewares/index'
import {
  createPublicProject,
  getPublicProjects,
  getPublicProject,
  purchaseProject,
  getMyPurchases,
  downloadProject,
  getCategories,
  uploadProjectFiles,
  deletePublicProject,
  createPaymentIntent,
  approveProject,
  rejectProject
} from '../controllers/explore.controller'

const exploreRouter = express.Router()
// global authentication middleware
exploreRouter.use(authenticate)

exploreRouter.get('/projects', uploadProjectFiles, getPublicProjects)
exploreRouter.get('/categories', getCategories)
exploreRouter.get('/projects/:id', getPublicProject)
exploreRouter.post('/projects', uploadProjectFiles, createPublicProject)
exploreRouter.post('/checkout/payment-intent', createPaymentIntent)
exploreRouter.post('/purchase', purchaseProject)
exploreRouter.get('/my-purchases', getMyPurchases)
exploreRouter.get('/download/:projectId', downloadProject)
exploreRouter.delete('/projects/:projectId', deletePublicProject)
exploreRouter.patch('/projects/:projectId/approve', requireSuperadmin,  approveProject)
exploreRouter.patch('/projects/:projectId/reject', requireSuperadmin, rejectProject)

export default exploreRouter

