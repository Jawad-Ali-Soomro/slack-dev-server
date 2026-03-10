import express from 'express'
import { authenticate, authorize, requireAdmin, requireSuperadmin } from '../middlewares'
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

const router = express.Router()
router.use(authenticate)

router.get('/projects', authenticate, getPublicProjects)
router.get('/categories', getCategories)


router.get('/projects/:id', getPublicProject)
router.post('/projects', uploadProjectFiles, createPublicProject)
router.post('/checkout/payment-intent', createPaymentIntent)
router.post('/purchase', purchaseProject)
router.get('/my-purchases', getMyPurchases)
router.get('/download/:projectId', downloadProject)
router.delete('/projects/:projectId', deletePublicProject)
router.patch('/projects/:projectId/approve', requireSuperadmin, approveProject)
router.patch('/projects/:projectId/reject', requireSuperadmin, rejectProject)

export default router

