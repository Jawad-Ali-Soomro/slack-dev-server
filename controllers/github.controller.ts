import { Request, Response } from 'express'
import { catchAsync } from '../middlewares/catchAsync'
import { GitHubRepo, GitHubPR, GitHubIssue, User } from '../models'

// Repository Controllers
export const createRepository = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { name, description, githubUrl, language, isPrivate, team, tags, contributors } = req.body

  const repository = await GitHubRepo.create({
    owner: userId, // Set owner to current user
    name,
    description,
    githubUrl,
    language,
    isPrivate: isPrivate || false,
    createdBy: userId,
    contributors: contributors || [],
    team,
    tags: tags || [],
    friends: []
  })

  res.status(201).json({
    success: true,
    message: 'Repository created successfully',
    repository
  })
})

export const getRepositories = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { status, team, search } = req.query

  let query: any = { 
    $or: [
      { createdBy: userId },
      { contributors: userId }
    ]
  }

  if (status) {
    query.status = status
  }

  if (team) {
    query.team = team
  }

  if (search) {
    query.$and = [
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { owner: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }
    ]
  }

  const repositories = await GitHubRepo.find(query)
    .populate('owner', 'username email avatar')
    .populate('contributors', 'username email avatar')
    .populate('team', 'name')
    .sort({ updatedAt: -1 })

  res.json({
    success: true,
    repositories
  })
})

export const getRepository = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id

  const repository = await GitHubRepo.findOne({ 
    _id: id, 
    $or: [
      { createdBy: userId },
      { contributors: userId }
    ]
  })
    .populate('owner', 'username email avatar')
    .populate('contributors', 'username email avatar')
    .populate('team', 'name')
    .populate('createdBy', 'username email avatar')

  if (!repository) {
    return res.status(404).json({
      success: false,
      message: 'Repository not found'
    })
  }

  res.json({
    success: true,
    repository
  })
})

export const updateRepository = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id
  const updateData = req.body

  const repository = await GitHubRepo.findOneAndUpdate(
    { _id: id, createdBy: userId },
    updateData,
    { new: true, runValidators: true }
  )

  if (!repository) {
    return res.status(404).json({
      success: false,
      message: 'Repository not found'
    })
  }

  res.json({
    success: true,
    message: 'Repository updated successfully',
    repository
  })
})

export const deleteRepository = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id

  // Also delete associated PRs and issues
  await Promise.all([
    GitHubPR.deleteMany({ repository: id }),
    GitHubIssue.deleteMany({ repository: id }),
    GitHubRepo.findOneAndDelete({ _id: id, createdBy: userId })
  ])

  res.json({
    success: true,
    message: 'Repository and associated data deleted successfully'
  })
})

// Pull Request Controllers
export const createPullRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { title, description, githubUrl, githubHash, repository, assignedTo, team, labels, priority, estimatedHours, dueDate } = req.body

  const pr = await GitHubPR.create({
    title,
    description,
    githubUrl,
    githubHash,
    repository,
    createdBy: userId,
    assignedTo: assignedTo && assignedTo.trim() !== '' ? assignedTo : undefined,
    team: team && team.trim() !== '' ? team : undefined,
    labels: labels || [],
    priority: priority || 'medium',
    estimatedHours,
    dueDate
  })

  const populatedPR = await GitHubPR.findById(pr._id)
    .populate('repository', 'name owner')
    .populate('assignedTo', 'username email avatar')
    .populate('team', 'name')

  res.status(201).json({
    success: true,
    message: 'Pull request created successfully',
    pullRequest: populatedPR
  })
})

export const getPullRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { repository, status, assignedTo, team, priority, search } = req.query

  let query: any = { createdBy: userId }

  if (repository) {
    query.repository = repository
  }

  if (status) {
    query.status = status
  }

  if (assignedTo) {
    query.assignedTo = assignedTo
  }

  if (team) {
    query.team = team
  }

  if (priority) {
    query.priority = priority
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { githubHash: { $regex: search, $options: 'i' } }
    ]
  }

  const pullRequests = await GitHubPR.find(query)
    .populate('repository', 'name owner')
    .populate('assignedTo', 'username email avatar')
    .populate('team', 'name')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    pullRequests
  })
})

export const updatePullRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id
  const updateData = req.body

  // Handle empty strings for ObjectId fields
  if (updateData.assignedTo && updateData.assignedTo.trim() === '') {
    updateData.assignedTo = undefined
  }
  if (updateData.team && updateData.team.trim() === '') {
    updateData.team = undefined
  }

  // If status is being updated to closed/merged, set completedAt
  if (updateData.status && ['closed', 'merged'].includes(updateData.status)) {
    updateData.completedAt = new Date()
  }

  const pr = await GitHubPR.findOneAndUpdate(
    { _id: id, createdBy: userId },
    updateData,
    { new: true, runValidators: true }
  )
    .populate('repository', 'name owner')
    .populate('assignedTo', 'username email avatar')
    .populate('team', 'name')

  if (!pr) {
    return res.status(404).json({
      success: false,
      message: 'Pull request not found'
    })
  }

  res.json({
    success: true,
    message: 'Pull request updated successfully',
    pullRequest: pr
  })
})

export const deletePullRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id

  const pr = await GitHubPR.findOneAndDelete({ _id: id, createdBy: userId })

  if (!pr) {
    return res.status(404).json({
      success: false,
      message: 'Pull request not found'
    })
  }

  res.json({
    success: true,
    message: 'Pull request deleted successfully'
  })
})

// Issue Controllers
export const createIssue = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { title, description, githubUrl, githubHash } = req.body
  let { repository, assignedTo, team, labels, priority, type, estimatedHours, dueDate } = req.body

  // Normalize empty strings for ObjectId fields
  if (typeof assignedTo === 'string' && assignedTo.trim() === '') assignedTo = undefined
  if (typeof team === 'string' && team.trim() === '') team = undefined

  // Resolve repository if not provided or empty string
  if (!repository || (typeof repository === 'string' && repository.trim() === '')) {
    if (githubUrl && typeof githubUrl === 'string') {
      try {
        // Expected issue URL: https://github.com/{owner}/{repo}/issues/{number}
        const parts = githubUrl.split('/')
        if (parts.length >= 5) {
          const baseRepoUrl = `${parts[0]}//${parts[2]}/${parts[3]}/${parts[4]}`
          const repoDoc = await GitHubRepo.findOne({ githubUrl: baseRepoUrl })
          if (repoDoc) {
            repository = repoDoc._id as any
          }
        }
      } catch {}
    }
  }

  

  const issue = await GitHubIssue.create({
    title,
    description,
    githubUrl,
    githubHash,
    repository,
    createdBy: userId,
    assignedTo,
    team,
    labels: labels || [],
    priority: priority || 'medium',
    type: type || 'bug',
    estimatedHours,
    dueDate
  })

  const populatedIssue = await GitHubIssue.findById(issue._id)
    .populate('repository', 'name owner')
    .populate('assignedTo', 'username email avatar')
    .populate('team', 'name')

  res.status(201).json({
    success: true,
    message: 'Issue created successfully',
    issue: populatedIssue
  })
})

export const getIssues = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { repository, status, assignedTo, team, priority, type, search } = req.query

  let query: any = { createdBy: userId }

  if (repository) {
    query.repository = repository
  }

  if (status) {
    query.status = status
  }

  if (assignedTo) {
    query.assignedTo = assignedTo
  }

  if (team) {
    query.team = team
  }

  if (priority) {
    query.priority = priority
  }

  if (type) {
    query.type = type
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { githubHash: { $regex: search, $options: 'i' } }
    ]
  }

  const issues = await GitHubIssue.find(query)
    .populate('repository', 'name owner')
    .populate('assignedTo', 'username email avatar')
    .populate('team', 'name')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    issues
  })
})

export const updateIssue = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id
  const updateData = req.body

  // Handle empty strings for ObjectId fields
  if (typeof updateData.assignedTo === 'string' && updateData.assignedTo.trim() === '') {
    updateData.assignedTo = undefined
  }
  if (typeof updateData.team === 'string' && updateData.team.trim() === '') {
    updateData.team = undefined
  }

  // If status is being updated to resolved/closed, set resolvedAt
  if (updateData.status && ['resolved', 'closed'].includes(updateData.status)) {
    updateData.resolvedAt = new Date()
  }

  const issue = await GitHubIssue.findOneAndUpdate(
    { _id: id, createdBy: userId },
    updateData,
    { new: true, runValidators: true }
  )
    .populate('repository', 'name owner')
    .populate('assignedTo', 'username email avatar')
    .populate('team', 'name')

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    })
  }

  res.json({
    success: true,
    message: 'Issue updated successfully',
    issue
  })
})

export const deleteIssue = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user?.id

  const issue = await GitHubIssue.findOneAndDelete({ _id: id, createdBy: userId })

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    })
  }

  res.json({
    success: true,
    message: 'Issue deleted successfully'
  })
})

// Dashboard/Stats Controllers
export const getGitHubStats = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id

  const [repositories, pullRequests, issues] = await Promise.all([
    GitHubRepo.countDocuments({ createdBy: userId }),
    GitHubPR.countDocuments({ createdBy: userId }),
    GitHubIssue.countDocuments({ createdBy: userId })
  ])

  const [openPRs, closedPRs, openIssues, resolvedIssues] = await Promise.all([
    GitHubPR.countDocuments({ createdBy: userId, status: 'open' }),
    GitHubPR.countDocuments({ createdBy: userId, status: { $in: ['closed', 'merged'] } }),
    GitHubIssue.countDocuments({ createdBy: userId, status: 'open' }),
    GitHubIssue.countDocuments({ createdBy: userId, status: { $in: ['resolved', 'closed'] } })
  ])

  res.json({
    success: true,
    stats: {
      repositories,
      pullRequests: {
        total: pullRequests,
        open: openPRs,
        closed: closedPRs
      },
      issues: {
        total: issues,
        open: openIssues,
        resolved: resolvedIssues
      }
    }
  })
})

// Get friends for contributor selection
export const getFriends = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id

  // For now, return all users except the current user as potential contributors
  // In a real app, you'd have a friends system
  const users = await User.find({ _id: { $ne: userId } })
    .select('username email avatar')
    .limit(50) // Limit to prevent too many results
  
  res.json({
    success: true,
    friends: users
  })
})
