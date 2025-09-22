import express from 'express';
import Assignment from '../models/Assignment.js';
const userRegistrosRouter = express.Router();

userRegistrosRouter.get('/:userId/registros', async (req, res) => {
  try {
    const assignments = await Assignment.find({ assignedTo: req.params.userId })
      .select('title description dueDate closeDate status createdAt')
      .lean();
    const registros = assignments.map(a => ({
      titulo: a.title,
      descripcion: a.description,
      fechaEntrega: a.dueDate,
      fechaCierre: a.closeDate,
      estado: a.status === 'completed' ? 'Entregado' : a.status === 'completed-late' ? 'Entregado con Retraso' : a.status === 'pending' ? 'Pendiente' : a.status === 'not-delivered' ? 'No Entregado' : a.status,
      creado: a.createdAt
    }));
    res.json(registros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default userRegistrosRouter;
