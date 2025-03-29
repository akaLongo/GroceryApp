import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  CssBaseline, 
  Container, 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  CircularProgress, 
  Alert, 
  Collapse, 
  IconButton as MuiIconButton,
  Backdrop,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Paper
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ListIcon from '@mui/icons-material/List';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { analyzeProductImage, analyzeNutritionLabel } from './services/openai';

const theme = createTheme({
  palette: {
    primary: {
      main: '#007AFF', // iOS blue
      light: '#47A1FF',
      dark: '#0056B3',
    },
    secondary: {
      main: '#5856D6', // iOS purple
    },
    background: {
      default: '#F2F2F7', // iOS light gray
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1C1E',
      secondary: '#8E8E93',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
  },
});

const LoadingOverlay = ({ open, message }) => (
  <Backdrop
    sx={{
      color: '#fff',
      zIndex: (theme) => theme.zIndex.drawer + 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }}
    open={open}
  >
    <CircularProgress color="inherit" />
    <Typography variant="h6">{message}</Typography>
  </Backdrop>
);

function App() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    quantity: '',
    productPhoto: null,
    nutritionLabel: null,
    nutritionInfo: null,
    description: '',
    isAnalyzing: false,
  });
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewNutrition, setPreviewNutrition] = useState(null);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // New state for list management
  const [currentListName, setCurrentListName] = useState('My List');
  const [listMenuAnchor, setListMenuAnchor] = useState(null);
  const [saveListDialogOpen, setSaveListDialogOpen] = useState(false);
  const [savedLists, setSavedLists] = useState([]);

  // Load saved lists on startup
  useEffect(() => {
    const lists = JSON.parse(localStorage.getItem('groceryLists') || '{}');
    setSavedLists(Object.keys(lists));
  }, []);

  // List management functions
  const handleSaveList = () => {
    const lists = JSON.parse(localStorage.getItem('groceryLists') || '{}');
    // Convert File objects to base64 strings before saving
    const itemsToSave = items.map(item => ({
      ...item,
      productPhoto: item.productPhoto ? getImageUrl(item, 'product') : null,
      nutritionLabel: item.nutritionLabel ? getImageUrl(item, 'nutrition') : null
    }));
    lists[currentListName] = itemsToSave;
    localStorage.setItem('groceryLists', JSON.stringify(lists));
    setSavedLists(Object.keys(lists));
    setSaveListDialogOpen(false);
  };

  const handleLoadList = (listName) => {
    const lists = JSON.parse(localStorage.getItem('groceryLists') || '{}');
    if (lists[listName]) {
      // Items are loaded with base64 strings instead of File objects
      setItems(lists[listName]);
      setCurrentListName(listName);
    }
    setListMenuAnchor(null);
  };

  const handleNewList = () => {
    setItems([]);
    setCurrentListName('New List');
    setListMenuAnchor(null);
    setSaveListDialogOpen(true);
  };

  const handleDeleteList = (listName) => {
    const lists = JSON.parse(localStorage.getItem('groceryLists') || '{}');
    delete lists[listName];
    localStorage.setItem('groceryLists', JSON.stringify(lists));
    setSavedLists(Object.keys(lists));
    if (currentListName === listName) {
      setItems([]);
      setCurrentListName('New List');
    }
    setListMenuAnchor(null);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewItem({
      name: '',
      price: '',
      quantity: '',
      productPhoto: null,
      nutritionLabel: null,
      nutritionInfo: null,
      description: '',
      isAnalyzing: false,
    });
    setPreviewProduct(null);
    setPreviewNutrition(null);
    setError(null);
  };

  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        if (type === 'product') {
          setNewItem({ ...newItem, productPhoto: file });
          setPreviewProduct(base64Image);
        } else {
          setNewItem({ ...newItem, nutritionLabel: file });
          setPreviewNutrition(base64Image);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = async () => {
    if (newItem.price && newItem.quantity) {
      try {
        setNewItem(prev => ({ ...prev, isAnalyzing: true }));
        setError(null);

        let updatedItem = { ...newItem };

        // Read product photo
        if (newItem.productPhoto) {
          try {
            const productBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(newItem.productPhoto);
            });

            const productAnalysis = await analyzeProductImage(productBase64);
            updatedItem = {
              ...updatedItem,
              name: productAnalysis.name,
              description: productAnalysis.description
            };
          } catch (err) {
            setError(`Failed to analyze product photo: ${err.message}`);
            return;
          }
        }

        // Read nutrition label
        if (newItem.nutritionLabel) {
          try {
            const nutritionBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(newItem.nutritionLabel);
            });

            const nutritionAnalysis = await analyzeNutritionLabel(nutritionBase64);
            updatedItem = {
              ...updatedItem,
              nutritionInfo: nutritionAnalysis
            };
          } catch (err) {
            setError(`Failed to analyze nutrition label: ${err.message}`);
            return;
          }
        }
        
        // Only add the item if we have at least a name from product analysis
        if (!updatedItem.name) {
          setError('Could not identify product. Please try taking a clearer photo.');
          return;
        }

        // Add to items list with the analyzed data
        setItems([...items, { ...updatedItem, id: Date.now() }]);
        handleClose();
      } catch (err) {
        setError(`Failed to process item: ${err.message}`);
        console.error(err);
      } finally {
        setNewItem(prev => ({ ...prev, isAnalyzing: false }));
      }
    }
  };

  const handleEditNutrition = (itemId) => {
    const item = items.find(item => item.id === itemId);
    if (item) {
      setEditingItem(item);
      // Ensure the card being edited is expanded
      setExpandedItems(new Set([itemId]));
    }
  };

  const handleSaveNutrition = (itemId) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, nutritionInfo: editingItem.nutritionInfo } : item
    ));
    setEditingItem(null);
    // Keep the card expanded after saving
    setExpandedItems(new Set([itemId]));
  };

  const handleNutritionChange = (itemId, field, value) => {
    setEditingItem(prev => ({
      ...prev,
      nutritionInfo: {
        ...prev.nutritionInfo,
        [field]: value
      }
    }));
  };

  const toggleExpand = (itemId) => {
    // If we're currently editing this item, don't allow collapse
    if (editingItem?.id === itemId) {
      return;
    }
    
    setExpandedItems(prev => {
      const newSet = new Set();
      if (!prev.has(itemId)) {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0).toFixed(2);
  };

  const getImageUrl = (item, type) => {
    if (type === 'product') {
      // If the item's photo is already a base64 string (loaded from storage), return it directly
      if (typeof item.productPhoto === 'string') {
        return item.productPhoto;
      }
      // Otherwise, create a URL from the File object
      return item.productPhoto ? URL.createObjectURL(item.productPhoto) : 'https://via.placeholder.com/140';
    }
    // Handle nutrition label similarly
    if (typeof item.nutritionLabel === 'string') {
      return item.nutritionLabel;
    }
    return item.nutritionLabel ? URL.createObjectURL(item.nutritionLabel) : null;
  };

  const handleDeleteItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
    // If the item being deleted is currently being edited, clear the editing state
    if (editingItem?.id === itemId) {
      setEditingItem(null);
    }
    // Remove from expanded items set if it's expanded
    if (expandedItems.has(itemId)) {
      const newExpandedItems = new Set(expandedItems);
      newExpandedItems.delete(itemId);
      setExpandedItems(newExpandedItems);
    }
  };

  const NutritionInfoDisplay = ({ item }) => {
    if (!item.nutritionInfo) return null;

    if (editingItem?.id === item.id) {
      return (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Serving Size"
            value={editingItem.nutritionInfo.servingSize || ''}
            onChange={(e) => handleNutritionChange(item.id, 'servingSize', e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <TextField
            label="Calories"
            type="number"
            value={editingItem.nutritionInfo.calories || ''}
            onChange={(e) => handleNutritionChange(item.id, 'calories', e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <TextField
            label="Protein (g)"
            type="number"
            value={editingItem.nutritionInfo.protein || ''}
            onChange={(e) => handleNutritionChange(item.id, 'protein', e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <TextField
            label="Carbohydrates (g)"
            type="number"
            value={editingItem.nutritionInfo.carbohydrates || ''}
            onChange={(e) => handleNutritionChange(item.id, 'carbohydrates', e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <TextField
            label="Sugar (g)"
            type="number"
            value={editingItem.nutritionInfo.sugar || ''}
            onChange={(e) => handleNutritionChange(item.id, 'sugar', e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <TextField
            label="Fat (g)"
            type="number"
            value={editingItem.nutritionInfo.fat || ''}
            onChange={(e) => handleNutritionChange(item.id, 'fat', e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleSaveNutrition(item.id)}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Serving Size: {item.nutritionInfo.servingSize || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Calories: {item.nutritionInfo.calories || '0'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Protein: {item.nutritionInfo.protein || '0'}g
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Carbs: {item.nutritionInfo.carbohydrates || '0'}g
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sugar: {item.nutritionInfo.sugar || '0'}g
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fat: {item.nutritionInfo.fat || '0'}g
        </Typography>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => handleEditNutrition(item.id)}
          sx={{ mt: 1 }}
        >
          Edit Nutrition
        </Button>
      </Box>
    );
  };

  const SpendingDonut = () => {
    const total = parseFloat(calculateTotal());
    const data = items.map(item => ({
      name: item.name,
      value: parseFloat(item.price) * parseInt(item.quantity)
    }));

    const COLORS = ['#007AFF', '#5856D6', '#FF2D55', '#FF9500', '#34C759', '#AF52DE'];

    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 4, 
          bgcolor: 'background.paper',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          mb: 4 
        }}
      >
        <Box sx={{ height: 200, position: 'relative' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                innerRadius="70%"
                outerRadius="90%"
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700 }}>
              ${total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Spent
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          {data.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: COLORS[index % COLORS.length],
                  mr: 1
                }}
              />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${item.value.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" color="text.primary">
              Grocery Tracker
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ListIcon />}
              onClick={(e) => setListMenuAnchor(e.currentTarget)}
              sx={{ px: 2 }}
            >
              {currentListName}
            </Button>
            <Box>
              <Menu
                anchorEl={listMenuAnchor}
                open={Boolean(listMenuAnchor)}
                onClose={() => setListMenuAnchor(null)}
              >
                <MenuItem onClick={handleNewList}>
                  <ListItemIcon>
                    <CreateNewFolderIcon fontSize="small" />
                  </ListItemIcon>
                  New List
                </MenuItem>
                <MenuItem onClick={() => setSaveListDialogOpen(true)}>
                  <ListItemIcon>
                    <SaveIcon fontSize="small" />
                  </ListItemIcon>
                  Save List
                </MenuItem>
                {savedLists.length > 0 && <Divider />}
                {savedLists.map((listName) => (
                  <MenuItem key={listName}>
                    <ListItemIcon>
                      <ListIcon fontSize="small" />
                    </ListItemIcon>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span onClick={() => handleLoadList(listName)} style={{ flexGrow: 1 }}>{listName}</span>
                      <MuiIconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(listName);
                        }}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </MuiIconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>
          
          <SpendingDonut />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h6" color="text.primary">
              Items ({items.length})
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleClickOpen}
            >
              Add Item
            </Button>
          </Box>

          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid item xs={12} sm={6} key={item.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={getImageUrl(item, 'product')}
                    alt={item.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <MuiIconButton
                          size="small"
                          onClick={() => handleDeleteItem(item.id)}
                          sx={{ 
                            color: 'error.main',
                            '&:hover': { bgcolor: 'error.light' }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </MuiIconButton>
                        <MuiIconButton
                          size="small"
                          onClick={() => toggleExpand(item.id)}
                          sx={{
                            transform: expandedItems.has(item.id) ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <ExpandMoreIcon fontSize="small" />
                        </MuiIconButton>
                      </Box>
                    </Box>
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {item.description}
                      </Typography>
                    )}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      bgcolor: 'background.default',
                      p: 1.5,
                      borderRadius: 2,
                      mb: 2
                    }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Quantity
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item.quantity}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          Price
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          ${item.price}
                        </Typography>
                      </Box>
                    </Box>
                    <Collapse in={expandedItems.has(item.id)}>
                      <NutritionInfoDisplay item={item} />
                    </Collapse>
                    {getImageUrl(item, 'nutrition') && (
                      <Button
                        size="small"
                        startIcon={<PhotoCamera />}
                        onClick={() => window.open(getImageUrl(item, 'nutrition'), '_blank')}
                        sx={{ mt: 1 }}
                      >
                        View Nutrition Label
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogContent>
              <LoadingOverlay 
                open={newItem.isAnalyzing} 
                message={
                  newItem.name 
                    ? "Analyzing nutrition label..." 
                    : "Analyzing product..."
                }
              />
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {newItem.name && (
                <Typography variant="h6" gutterBottom>
                  {newItem.name}
                </Typography>
              )}
              {newItem.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {newItem.description}
                </Typography>
              )}
              <TextField
                margin="dense"
                label="Price"
                type="number"
                fullWidth
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                disabled={newItem.isAnalyzing}
              />
              <TextField
                margin="dense"
                label="Quantity"
                type="number"
                fullWidth
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                disabled={newItem.isAnalyzing}
              />
              
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Product Photo
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CameraAltIcon />}
                    disabled={newItem.isAnalyzing}
                  >
                    Take Photo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, 'product')}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCamera />}
                    disabled={newItem.isAnalyzing}
                  >
                    Upload Photo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'product')}
                    />
                  </Button>
                </Box>
                {previewProduct && (
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={previewProduct}
                      alt="Product preview"
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Box>

              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Nutrition Label
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CameraAltIcon />}
                    disabled={newItem.isAnalyzing}
                  >
                    Take Photo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, 'nutrition')}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCamera />}
                    disabled={newItem.isAnalyzing}
                  >
                    Upload Photo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'nutrition')}
                    />
                  </Button>
                </Box>
                {previewNutrition && (
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={previewNutrition}
                      alt="Nutrition label preview"
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} disabled={newItem.isAnalyzing}>Cancel</Button>
              <Button 
                onClick={handleAddItem} 
                variant="contained" 
                color="primary" 
                disabled={newItem.isAnalyzing || !newItem.price || !newItem.quantity}
              >
                Add
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add Save List Dialog */}
          <Dialog open={saveListDialogOpen} onClose={() => setSaveListDialogOpen(false)}>
            <DialogTitle>Save List</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="List Name"
                fullWidth
                value={currentListName}
                onChange={(e) => setCurrentListName(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSaveListDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveList} variant="contained" color="primary">
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App; 