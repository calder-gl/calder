from math import sqrt, atan2
import numpy as np

N = 64
HALF_N = int(N/2)
FEATURE_VEC_DIM = 3
ANGLE_HISTOGRAM_SIZE = 30

def makeYRotMat(angle):
  return np.array([[np.cos(angle), 0, np.sin(angle)],
                   [0, 1, 0],
                   [-np.sin(angle), 0, np.cos(angle)]])

def fourier3DCoefficient(voxel_grid, u, v, w):
  coeff = np.complex(0, 0)
  for i in range(-HALF_N, HALF_N):
    for j in range(-HALF_N, HALF_N):
      for k in range(-HALF_N, HALF_N):
        coeff += voxel_grid[i+HALF_N][j+HALF_N][k+HALF_N] * np.exp(np.complex(0, 2*np.pi / N * (i*u + j*v + k*w)))
  coeff /= N ** 1.5
  return coeff

def dedupPoints(pts):
  if len(pts) == 0:
    return
  deduped = [pts[0]]
  for p in pts[1:]:
    found_dup = False
    for d in deduped:
      if d[0] == p[0] and d[1] == p[1] and d[2] == p[2]:
        found_dup = True
        break
    if not found_dup:
      deduped.append(p)
  return deduped

def polygonArea(pts):
  if len(pts) < 3:
    return 0 # not a polygon
  if len(pts) == 3:
    return 0.5 * vecnorm(np.cross(pts[1] - pts[0], pts[2] - pts[0]))
  area_vec = np.zeros((3))

  normal = np.zeros((3))
  start_idx = 0
  while normal[0] == 0 and normal[1] == 0 and normal[2] == 0 and start_idx < len(pts) - 2:
    normal = np.cross(pts[start_idx + 1] - pts[start_idx], pts[start_idx+2] - pts[start_idx])
    start_idx += 1
  if vecnorm(normal) == 0:
    return 0
  normal /= vecnorm(normal)
  for (p1, p2) in zip(pts, pts[1:] + [pts[0]]):
    crossprod = np.cross(p1, p2)
    area_vec += crossprod
  return np.abs(np.dot(area_vec, normal) * 0.5)

def vecnorm(v):
  return sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)

def sortEigs(eigs):
  def sort(eig):
    (val, vec) = eig
    return -val
  (vals, vecs) = eigs
  val_vec_pairs = []
  for i in range(len(vals)):
    val_vec_pairs.append((vals[i], vecs[:, i]))
  sorted_val_vec_pairs = sorted(val_vec_pairs, key=sort)

  sorted_eigvals = np.zeros((3))
  sorted_eigvecs = np.zeros((3, 3))
  for (i, (val, vec)) in enumerate(sorted_val_vec_pairs):
    sorted_eigvals[i] = val
    sorted_eigvecs[:, i] = vec
  return (sorted_eigvals, sorted_eigvecs)

def clipLine(a, b, p, n):
  clip_a = np.dot(a - p, n)
  clip_b = np.dot(b - p, n)

  if clip_a >= 0 and clip_b >= 0:
    # trivially accept
    return (0, [a, b])
  if clip_a < 0 and clip_b < 0:
    # trivially reject
    return (1, [])
  # NOTE: there may be numerical issues if a and b are on the plane
  clipped = clip_a / (clip_a - clip_b) * (b - a) + a
  if clip_a < 0:
    # line entering halfspace
    return (2, [clipped, b])
  else:
    # line exiting halfspace
    return (3, [a, clipped])

class TriMesh:
  def __init__(self, vs, ts):
    self.vertices = vs
    self.triangles = ts

  def getTriVertices(self, tri):
    return list(map(lambda x: self.vertices[x], tri))

  def surfaceArea(self):
    surf_area = 0
    for t in self.triangles:
      vs = self.getTriVertices(t)
      surf_area += polygonArea(vs)
    return surf_area

  def boundingBox(self):
    minpt = None
    maxpt = None
    for v in self.vertices:
      if minpt == None:
        minpt = v.copy()
      if maxpt == None:
        maxpt = v.copy()
      for (i, x) in enumerate(v):
        minpt[i] = min(minpt[i], x)
        maxpt[i] = max(maxpt[i], x)
    return (minpt, maxpt)

  def applyTranslationInvariant(self):
    center_gravity = np.zeros((3))
    for t in self.triangles:
      [v1, v2, v3] = self.getTriVertices(t)
      center_gravity += (v1 + v2 + v3) / 3 * polygonArea([v1, v2, v3])
    center_gravity /= self.surfaceArea()

    for i in range(len(self.vertices)):
      self.vertices[i] -= center_gravity

    return self

  def applyRotationInvariant(self):
    xz_histogram = [[i, 0] for i in range(ANGLE_HISTOGRAM_SIZE)]
    for v in self.vertices:
      angle = atan2(-v[2], v[0])
      if angle < 0:
        angle += 2*np.pi
      xz_histogram[int(angle * (ANGLE_HISTOGRAM_SIZE / 2) / np.pi)][1] += np.linalg.norm(v)
    xz_histogram = sorted(xz_histogram, key=lambda x: -x[1])

    y_rotation = -xz_histogram[0][0] * np.pi / (ANGLE_HISTOGRAM_SIZE / 2)
    rot_mat = makeYRotMat(y_rotation)

    for (i, v) in enumerate(self.vertices):
      self.vertices[i] = (rot_mat @ v.reshape((3, 1))).reshape((3))

    return self

  def applyReflectionInvariant(self):
    signs = np.zeros((3))
    for t in self.triangles:
      [v1, v2, v3] = self.getTriVertices(t)
      v = (v1 + v2 + v3) / 3
      signs += np.sign(v) * v * v * polygonArea([v1, v2, v3])
    signs /= self.surfaceArea()

    new_signs = np.zeros((3))
    for (i, s) in enumerate(signs):
      if s < 0.00001 and s > -0.00001:
        new_signs[i] = 1
      else:
        new_signs[i] = s

    sign_mat = np.diag(np.sign(new_signs))

    for (i, v) in enumerate(self.vertices):
      self.vertices[i] = (sign_mat @ v.reshape((3, 1))).reshape((3))

    return self

  def applyScaleInvariant(self):
    scales = np.zeros((3))
    for t in self.triangles:
      [v1, v2, v3] = self.getTriVertices(t)
      v = (v1 + v2 + v3) / 3
      scales += np.abs(v) * polygonArea([v1, v2, v3])
    scales /= self.surfaceArea()

    invariant_scale = np.linalg.norm(scales) / sqrt(3)

    for i in range(len(self.vertices)):
      self.vertices[i] /= invariant_scale

    return self

# Assumes triangular meshes
def importOBJFile(fname):
  vertices = []
  triangles = []

  with open(fname) as f:
    for line in f:
      words = line.split()
      if len(words) == 0:
        continue
      if words[0] == 'v':
        pts = np.array(list(map(float, words[1:])))
        vertices.append(pts)
      elif words[0] == 'f':
        parts = map(lambda x: x.split('/'), words[1:])
        pos_idxs = list(map(lambda x: int(x[0]) - 1, parts))
        triangles.append(pos_idxs)

  return TriMesh(vertices, triangles)

def generateVoxelGrid(fname):
  mesh = importOBJFile(fname) \
          .applyTranslationInvariant() \
          .applyRotationInvariant() \
          .applyReflectionInvariant() \
          .applyScaleInvariant()

  (bbox_min, bbox_max) = mesh.boundingBox()

  # Expand bbox slightly
  box_expansion = (bbox_max - bbox_min) * 0.001
  bbox_min -= box_expansion
  bbox_max += box_expansion
  increments = []
  for i in range(3):
    increments.append((bbox_max[i] - bbox_min[i]) / N)

  voxel_grid = [[[0.0 for _ in range(N)] \
                 for _ in range(N)] \
                for _ in range(N)]
  def findVoxelCoords(pt):
    voxel_pos = pt - bbox_min
    x = int(voxel_pos[0] / increments[0])
    y = int(voxel_pos[1] / increments[1])
    z = int(voxel_pos[2] / increments[2])
    return [x, y, z]

  plane_normals = [np.array([1, 0, 0]), # left
                   np.array([-1, 0, 0]), # right
                   np.array([0, 1, 0]), # bottom
                   np.array([0, -1, 0]), # top
                   np.array([0, 0, 1]), # back
                   np.array([0, 0, -1])] # front
  def addTriToVoxel(t, vs, x, y, z):
    left_plane_pt = np.array([bbox_min[0] + increments[0]*x, 0, 0])
    right_plane_pt = np.array([bbox_min[0] + increments[0]*(x + 1), 0, 0])
    bottom_plane_pt = np.array([0, bbox_min[1] + increments[1]*y, 0])
    top_plane_pt = np.array([0, bbox_min[1] + increments[1]*(y + 1), 0])
    back_plane_pt = np.array([0, 0, bbox_min[2] + increments[2]*z])
    front_plane_pt = np.array([0, 0, bbox_min[2] + increments[2]*(z + 1)])
    plane_pts = [left_plane_pt, right_plane_pt,
                 bottom_plane_pt, top_plane_pt,
                 back_plane_pt, front_plane_pt]
    v_in = vs
    for p, n in zip(plane_pts, plane_normals):
      v_out = []
      for i in range(len(v_in)):
        (status, clipped_line) = clipLine(v_in[i], v_in[(i + 1) % len(v_in)], p, n)
        if status == 0:
          # fully in halfspace
          v_out.append(clipped_line[1])
        elif status == 1:
          # fully out of halfspace, no new points
          pass
        elif status == 2:
          # entering halfspace
          v_out.append(clipped_line[0])
          v_out.append(clipped_line[1])
        elif status == 3:
          # exiting halfspace
          v_out.append(clipped_line[1])
      if len(v_out) == 0:
        break
      v_out = dedupPoints(v_out)
      v_in = v_out
    area = polygonArea(v_out)
    voxel_grid[x][y][z] += area

  for t, tri in enumerate(mesh.triangles):
    vs = mesh.getTriVertices(tri)
    max_voxel_coords = [0, 0, 0]
    min_voxel_coords = [N, N, N]
    for v in vs:
      v_voxel_pos = findVoxelCoords(v)
      for i, c in enumerate(v_voxel_pos):
        min_voxel_coords[i] = min(c, min_voxel_coords[i])
        max_voxel_coords[i] = max(c, max_voxel_coords[i])
    for x in range(min_voxel_coords[0], max_voxel_coords[0] + 1):
      for y in range(min_voxel_coords[1], max_voxel_coords[1] + 1):
        for z in range(min_voxel_coords[2], max_voxel_coords[2] + 1):
          addTriToVoxel(t, vs, x, y, z)

  return voxel_grid

def buildFeatureVector(fname):
  voxel_grid = generateVoxelGrid(fname)
  feature_vec = []
  for u in range(-FEATURE_VEC_DIM, FEATURE_VEC_DIM+1):
    for v in range(-FEATURE_VEC_DIM, FEATURE_VEC_DIM+1):
      for w in range(-FEATURE_VEC_DIM, FEATURE_VEC_DIM+1):
        feature_vec.append(fourier3DCoefficient(voxel_grid, u, v, w))

  half_feature_vec = int((len(feature_vec) + 1) / 2)
  return np.real(feature_vec[:half_feature_vec])
