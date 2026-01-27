import express from 'express'
import { authenticate } from '../middlewares'
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
  createPaymentIntent
} from '../controllers/explore.controller'

const router = express.Router()

router.get('/projects', getPublicProjects)
router.get('/categories', getCategories)

router.use(authenticate)

router.get('/projects/:id', getPublicProject)
router.post('/projects', uploadProjectFiles, createPublicProject)
router.post('/checkout/payment-intent', createPaymentIntent)
router.post('/purchase', purchaseProject)
router.get('/my-purchases', getMyPurchases)
router.get('/download/:projectId', downloadProject)
router.delete('/projects/:projectId', deletePublicProject)

export default router

